const mongoose = require("mongoose");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bcrypt = require("bcrypt");
const redisClient = require("./redis");
const port = 3000;
const jwt = require("jsonwebtoken");
const authMiddleware = require("./authMiddleware");
require("dotenv").config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

const url = "mongodb://root:password@db:27017/superapp_db?authSource=admin";

const taskSchema = mongoose.Schema({
  name: String,
  description: String,
  readiness: Boolean,
  created: Date,
  priority: Number,
  userId: mongoose.Schema.Types.ObjectId,
});

const userSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  username: String,
  password: String,
  age: Number,
  country: String,
  gender: String,
  pfp: String,
  phone: String,
  isAdmin: Boolean,
});

const mainPageSchema = mongoose.Schema({
  image: String,
  name: String,
  nameOnRussian: String,
  description: String,
  descriptionOnRussian: String,
  created: Date,
});

const productSchema = mongoose.Schema({
  name: String,
  description: String,
  category: String,
  price: Number,
});

const interactionSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
    required: true,
    index: true,
  },
  interactionType: {
    type: String,
    enum: ["view", "like", "purchase"],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

const Task = new mongoose.model("tasks", taskSchema, "tasks");
const User = new mongoose.model("users", userSchema, "users");
const MainPage = new mongoose.model("main-page", mainPageSchema, "main-page");
const Product = new mongoose.model("products", productSchema, "products");
const Interaction = new mongoose.model(
  "interactions",
  interactionSchema,
  "interactions"
);

try {
  mongoose.connect(url);
} catch (e) {
  console.error(e);
}

app.use(express.json());
app.use("/tasks", authMiddleware);
app.use("/products", authMiddleware);
app.use("/recommendations", authMiddleware);
app.use("/interactions", authMiddleware);

const JWT_SECRET = process.env.JWT_SECRET;

app.get("/tasks", async (req, res) => {
  try {
    const userId = req.query.id;
    const priority = +req.query.priority;
    const isReady = +req.query.isReady;

    const field =
      +req.query.priority !== 0
        ? +req.query.isReady !== 0
          ? {
              priority: req.query.priority,
              readiness: +req.query.isReady === 1 ? true : false,
              userId: new mongoose.Types.ObjectId(req.query.id),
            }
          : {
              priority: req.query.priority,
              userId: new mongoose.Types.ObjectId(req.query.id),
            }
        : +req.query.isReady !== 0
        ? {
            readiness: +req.query.isReady === 1 ? true : false,
            userId: new mongoose.Types.ObjectId(req.query.id),
          }
        : {
            userId: new mongoose.Types.ObjectId(req.query.id),
          };

    const cacheKey = `tasks:${userId}:${priority}:${isReady}`;

    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));
    const result = await Task.find(field).lean();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    return res.status(201).json(result);
  } catch (e) {
    console.error(e);
  }
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const cacheKey = `tasks:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));

    const result = await Task.find({ _id: req.params.id });

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post("/tasks", async (req, res) => {
  const body = new Task(req.body);
  try {
    const newTask = await body.save();
    res.status(201).json(newTask);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    res.status(201).json(task);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/tasks", async (req, res) => {
  const newTask = {
    name: req.body.name,
    description: req.body.description,
    readiness: req.body.readiness,
    priority: req.body.priority,
  };
  try {
    const task = await Task.findByIdAndUpdate(req.body.id, newTask, {
      new: true,
    });
    res.status(201).json(task);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const cacheKey = `users`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));

    const result = await Task.find();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    return res.status(201).json(result);
  } catch (e) {
    return res.status(400).json({ message: "Error" });
  }
});

app.get("/users/:username", async (req, res) => {
  try {
    const cacheKey = `users:${req.params.username}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));

    const result = await User.find({ username: req.params.username });
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    return res.status(201).json(result);
  } catch (e) {
    return res.status(400).json({ message: "Error" });
  }
});

app.post("/users", async (req, res) => {
  const { firstName, lastName, email, username, password, pfp, isAdmin } =
    req.body;
  const salt = await bcrypt.genSalt(10);
  const body = new User({
    firstName,
    lastName,
    email,
    username,
    pfp,
    isAdmin,
    password: await bcrypt.hash(password, salt),
  });
  try {
    const check = await User.find({ username: req.body.username });
    if (check.length === 0) {
      const newUser = await body.save();
      res.status(201).json(newUser);
    } else {
      res.status(201).json({ check: "There is already such user" });
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        username: req.body.username,
        password: req.body.password,
        pfp: req.body.pfp,
        gender: req.body.gender,
        country: req.body.country,
        phone: req.body.phone,
        age: req.body.age,
      },
      {
        new: true,
      }
    );
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params);
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const payload = {
      user: {
        id: user._id.toString(),
        username: user.username,
        isAdmin: user.isAdmin,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "3h" });
    res.status(200).json({
      token,
      userId: user._id.toString(),
      username: user.username,
      isAdmin: user.isAdmin,
    });
  } catch (e) {
    res.status(400).json({ message: "Something went wrong" });
  }
});

app.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log(req.user);
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/interactions", authMiddleware, async (req, res) => {
  const { productId, interactionType } = req.body;

  if (!productId || !interactionType) {
    return res
      .status(400)
      .json({ message: "productId and interactionType are required." });
  }

  if (!["view", "like", "purchase"].includes(interactionType)) {
    return res.status(400).json({ message: "Invalid interactionType." });
  }

  try {
    const userId = req.user.id;

    if (interactionType === "like") {
      const existingLike = await Interaction.findOne({
        userId,
        productId,
        interactionType: "like",
      });
      if (existingLike) {
        return res
          .status(200)
          .json({ message: "User already liked this product." });
      }
    }

    const newInteraction = new Interaction({
      userId,
      productId,
      interactionType,
    });

    await newInteraction.save();
    res.status(201).json(newInteraction);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error logging interaction" });
  }
});

app.get("/recommendations", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const allUserInteractedProductIds = (
      await Interaction.find({ userId: userId }).select("productId")
    ).map((i) => i.productId);

    const userPositiveProductIds = (
      await Interaction.find({
        userId: userId,
        interactionType: { $in: ["like", "purchase"] },
      }).select("productId")
    ).map((i) => i.productId);

    let recommendations = [];

    if (userPositiveProductIds.length > 0) {
      const similarUsers = await Interaction.find({
        productId: { $in: userPositiveProductIds },
        userId: { $ne: userId },
        interactionType: { $in: ["like", "purchase"] },
      }).distinct("userId");

      if (similarUsers.length > 0) {
        recommendations = await Interaction.aggregate([
          {
            $match: {
              userId: { $in: similarUsers },
              interactionType: { $in: ["like", "purchase"] },
              productId: { $nin: allUserInteractedProductIds },
            },
          },
          {
            $group: {
              _id: "$productId",
              score: { $sum: 1 },
            },
          },
          { $sort: { score: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          { $replaceRoot: { newRoot: "$productDetails" } },
        ]);
      }
    }

    if (recommendations.length === 0) {
      recommendations = await Interaction.aggregate([
        {
          $match: {
            interactionType: { $in: ["purchase", "like"] },
            productId: { $nin: allUserInteractedProductIds },
          },
        },
        {
          $group: {
            _id: "$productId",
            score: { $sum: 1 },
          },
        },
        { $sort: { score: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        { $replaceRoot: { newRoot: "$productDetails" } },
      ]);
    }

    res.status(200).json(recommendations);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error fetching recommendations" });
  }
});

app.get("/interactions/history", authMiddleware, async (req, res) => {
  try {
    const history = await Interaction.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .populate("productId");

    res.status(200).json(history);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error fetching history" });
  }
});

app.post("/sendEmail", async (req, res) => {
  const { user, pass, to, subject, text, filename, content, service } =
    req.body;
  console.log(req.body);
  const transporter = nodemailer.createTransport({
    host: "smtp" + service,
    secure: false,
    port: 587,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: user,
    to,
    attachments: filename
      ? [
          {
            filename,
            content,
          },
        ]
      : null,
    subject,
    text,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(400).send({
        message: "Something went wrong, check out inputs and try again!",
        error,
      });
    } else {
      res.status(200).send({ message: info.response });
    }
  });
});

app.get("/main-page", async (req, res) => {
  try {
    const cacheKey = `main-page`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));

    const result = await MainPage.find();

    await redisClient.setEx(cacheKey, 60, result);

    return res.status(201).json(result);
  } catch (e) {
    return res.status(400).json({ message: "Error" });
  }
});

app.post("/main-page", async (req, res) => {
  const body = new MainPage(req.body);
  try {
    const newMainPageItem = await body.save();
    res.status(201).json(newMainPageItem);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/main-page/:id", async (req, res) => {
  try {
    const home = await MainPage.findByIdAndDelete(req.params.id);
    res.status(201).json(home);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/main-page/:id", async (req, res) => {
  try {
    const home = await MainPage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(201).json(home);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    let field = {};
    const { search } = req.query;

    if (search) {
      field = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    const cacheKey = `products:${JSON.stringify(field)}`;

    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));
    const result = await Product.find(field).lean();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    return res.status(201).json(result);
  } catch (e) {
    console.error(e);
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const cacheKey = `products:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return res.status(200).json(JSON.parse(cached));

    const result = await Product.find({ _id: req.params.id });

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));

    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post("/products", async (req, res) => {
  const body = new Product(req.body);
  try {
    const newProduct = await body.save();
    res.status(201).json(newProduct);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/products", async (req, res) => {
  const newProduct = {
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    price: req.body.price,
  };
  try {
    const product = await Product.findByIdAndUpdate(req.body.id, newProduct, {
      new: true,
    });
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
