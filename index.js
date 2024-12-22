const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// const corsOptions = {
//   origin: ['http://localhost:5173'],
//   credentials: true,
//   optionalsSuccessStatus: 200,
// };
// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(cookieParser());
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.SECRET_NAME}:${process.env.SECRET_PASS}@cluster0.whh17.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );

    const database = client.db('House_service');
    const serviceCollection = database.collection('service');
    //sirvice post
    app.post('/addservice', async (req, res) => {
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
