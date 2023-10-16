const express = require('express')
const app = express()
const port = process.env.PORT || 5000
require("dotenv").config();
const jwt = require('jsonwebtoken');
const cors = require('cors')


//meddleware ...............................
app.use(cors())
app.use(express.json());
//  verify jwt token........................ 
const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unathorized user' })
    }


    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.access_token, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'Unathorized user' })
        }
        req.decoded = decoded;
        next()
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.g50jtk2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const userCollection = client.db("foodDb").collection("users");
        const menuCollection = client.db("foodDb").collection("menu");
        const reviewCollection = client.db("foodDb").collection("review");
        const cartCollection = client.db("foodDb").collection("carts");


        // jwt implement.................................

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.access_token, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyAdmin = async(req, res, next) => {
                const email = req.decoded.email;
                const query = { email: email }
                const user = await userCollection.findOne(query)
                if (user.role !== 'admin') {

                    return res.status(403).send({ error: true, massage: 'forbidden user' })
                }
                next()

            }
            // user collection .............................
        app.post('/users', async(req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "all ready existing User" })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.get('/users', verifyJwt, verifyAdmin, async(req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.delete('/users/:id', async(req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await userCollection.deleteOne(query)
                res.send(result)
            })
            // make a Admin.................................
        app.get('/users/admin/:email', verifyJwt, verifyAdmin, async(req, res) => {
            const email = req.params.email
            if (req.decoded.email !== email) {
                res.send({ admin: false })

            }
            const query = { email: email }

            const user = await userCollection.findOne(query)
            const result = { admin: user.role === 'admin' }
            res.send(result)
        })
        app.patch('/users/admin/:id', async(req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        //   menu collection  .............................
        app.get('/menu', async(req, res) => {
                const result = await menuCollection.find().toArray()
                res.send(result)
            })
            // review collection ..............................
        app.get('/reviews', async(req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        //    cart collection .........................................
        app.get('/carts', verifyJwt, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Unathorized user' })
            }
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)


        })
        app.post('/carts', async(req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })
        app.delete('/carts/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})