const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.use(
  cors({
    origin: [
      'https://prodeact-service.web.app',
      'https://prodeact-service.firebaseapp.com',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.SECRET_NAME}:${process.env.SECRET_PASS}@cluster0.whh17.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//verify-token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden: Invalid token' });
    }
    req.user = decoded;

    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );

    const database = client.db('House_service');
    const serviceCollection = database.collection('service');
    const reviewCollection = database.collection('review');

    //generater jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.JWT_SECRET_KEY, {
        expiresIn: '90d',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: (process.env.NODE_ENV = 'producation'),
          sameSite: (process.env.NODE_ENV = 'producation' ? 'none' : 'strict'),
        })
        .send({ success: true });
    });
    //logout
    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: (process.env.NODE_ENV = 'producation'),
          sameSite: (process.env.NODE_ENV = 'producation' ? 'none' : 'strict'),
        })
        .send({ success: true });
    });
    //sirvice post
    app.post('/addservice', verifyToken, async (req, res) => {
      const addService = req.body;
      const result = await serviceCollection.insertOne(addService);
      res.send(result);
    });

    //service get
    app.get('/service', async (req, res) => {
      const query = serviceCollection.find().limit(6);
      const result = await query.toArray();
      res.send(result);
    });
    app.get('/myservice/:email', verifyToken, async (req, res) => {
      try {
        const decodeEmail = req.user?.email;
        const email = req.params.email;
        const filter = req.query.filter || '';
        const search = req.query.search || '';
        let query = { userEmail: email };
        // console.log('decode', decodeEmail);
        // console.log('parmas', email);
        if (decodeEmail !== email)
          return res.status(401).send({ message: 'Unauthorized access' });
        if (filter) query.category = filter;
        if (search) query.title = { $regex: search, $options: 'i' };

        const result = await serviceCollection.find(query).toArray();

        // Send the response
        res.send(result);
      } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.delete('/service/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/all-service', async (req, res) => {
      const filter = req.query.filter || '';
      let query = {};

      if (filter) {
        query.category = filter;
      }
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });
    //user
    app.get('/user-count', async (req, res) => {
      const { userEmail } = req.query;

      const result = await serviceCollection
        .aggregate([
          {
            $match: { userEmail },
          },
          {
            $group: {
              _id: '$userEmail',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      const userCount = result.length > 0 ? result[0].count : 0;

      res.send({ userEmail, serviceCount: userCount });
    });
    //update service
    app.put('/update-service/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedService = req.body;
      const query = { _id: new ObjectId(id) };

      const update = { $set: updatedService };
      const options = { upsert: false };
      const result = await serviceCollection.updateOne(query, update, options);
      res.send(result);
    });
    //find
    app.get('/details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });
    //post revie
    app.post('/review', verifyToken, async (req, res) => {
      const addReview = req.body;
      const result = await reviewCollection.insertOne(addReview);
      res.send(result);
    });
    //get the client side

    app.get('/review-show/:email', verifyToken, async (req, res) => {
      const decodeEmail = req.user?.email;
      const email = req.params.email;
      const query = { 'person.email': email };
      if (decodeEmail !== email)
        return res.status(401).send({ message: 'Unauthorized access' });
      const result = await reviewCollection.find(query).toArray();

      res.send(Array.isArray(result) ? result : [result]);
    });

    //delete the review
    app.delete('/review/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });
    //review update
    app.patch('/review/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { review, rating, title } = req.body;

      const filter = { _id: new ObjectId(id) };
      const update = { $set: { review, rating, title } };
      const result = await reviewCollection.updateOne(filter, update);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('House Service');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
