////////////////////////////////
//      IMPORTS AND SETUP     //
////////////////////////////////

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
// require("dotenv").config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://byson94.github.io",
  "https://biszbo.onrender.com",
];

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(
  cors({
    origin: allowedOrigins,
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

/////////////////////////
//      CONTACTS       //
/////////////////////////

async function updateContacts(uuid, newContact) {
  const { data, error: selectError } = await supabaseAdmin
    .from("Contacts")
    .select("contacts")
    .eq("uuid", uuid)
    .single();

  if (selectError && selectError.code !== "PGRST116")
    throw new Error(selectError.message);

  let updatedContacts;
  if (data) {
    const currentContacts = data.contacts || [];
    if (!currentContacts.includes(newContact)) {
      updatedContacts = [...currentContacts, newContact];
      if (currentContacts.length < 50) {
        const { error: updateError } = await supabaseAdmin
          .from("Contacts")
          .update({ contacts: updatedContacts })
          .eq("uuid", uuid);
        if (updateError) throw new Error(updateError.message);
      } else {
        throw new Error("50 contact limit REACHED!");
      }
    }
  } else {
    updatedContacts = [newContact];
    const { error: insertError } = await supabaseAdmin
      .from("Contacts")
      .insert({ uuid, contacts: updatedContacts });
    if (insertError) throw new Error(insertError.message);
  }
}

app.post("/contacts/add", async (req, res) => {
  const { userA, userB } = req.body;
  if (!userA || !userB)
    return res.status(400).json({ error: "Missing user IDs" });

  try {
    await Promise.all([
      updateContacts(userA, userB),
      updateContacts(userB, userA),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/contacts/remove", async (req, res) => {
  const { userA, userB } = req.body;
  if (!userA || !userB)
    return res.status(400).json({ error: "Missing user IDs" });

  try {
    const { data, error } = await supabaseAdmin
      .from("Contacts")
      .select("contacts")
      .eq("uuid", userA)
      .single();

    if (error || !data) throw new Error("User not found or fetch failed");

    const updatedContacts = (data.contacts || []).filter(
      (contact) => contact !== userB
    );

    const { error: updateError } = await supabaseAdmin
      .from("Contacts")
      .update({ contacts: updatedContacts })
      .eq("uuid", userA);

    if (updateError) throw new Error(updateError.message);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/contacts/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from("Contacts")
      .select("contacts")
      .eq("uuid", userId)
      .single();

    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
