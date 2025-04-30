////////////////////////////////
//      IMPORTS AND SETUP     //
////////////////////////////////

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
});

const mongodbUrl = process.env.MONGODB_URL;

//////////////////////////////
//     MESSAGE STORAGE      //
//////////////////////////////

mongoose
  .connect(mongodbUrl)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const messageSchema = new mongoose.Schema({
  contentID: { type: String, required: true, unique: true },
  messages: [
    {
      UID: { type: String, required: true },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Message = mongoose.model("Message", messageSchema);

app.post("/addMessage", async (req, res) => {
  const { message, UID, contentID } = req.body;

  try {
    let existingMessage = await Message.findOne({ contentID });

    if (existingMessage) {
      existingMessage.messages.push({ UID, message });
      await existingMessage.save();
      return res
        .status(200)
        .json({ message: "Message added to existing content" });
    } else {
      const newMessage = new Message({
        contentID,
        messages: [{ UID, message }],
      });
      await newMessage.save();
      return res
        .status(201)
        .json({ message: "New content created with message" });
    }
  } catch (error) {
    console.error("Error adding message:", error);
    return res.status(500).json({ message: "Error adding message" });
  }
});

app.post("/getAllMessages", async (req, res) => {
  const { contentID } = req.body;

  if (!contentID || typeof contentID !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or missing contentID" });
  }

  try {
    const existingMessage = await Message.findOne({ contentID });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "No messages found for this contentID",
      });
    }

    return res.status(200).json({
      success: true,
      messageCount: existingMessage.messages.length,
      messages: existingMessage.messages,
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
});

app.post("/createSchema", async (req, res) => {
  const { contentID, messages } = req.body;

  try {
    const existingContent = await Message.findOne({ contentID });

    if (existingContent) {
      return res.status(400).json({ message: "ContentID already exists" });
    }

    const newMessageSchema = new Message({
      contentID,
      messages: messages || [],
    });

    await newMessageSchema.save();

    return res.status(201).json({
      message: "New content schema created successfully",
      contentID: newMessageSchema.contentID,
    });
  } catch (error) {
    console.error("Error creating schema:", error);
    return res.status(500).json({ message: "Error creating schema" });
  }
});
