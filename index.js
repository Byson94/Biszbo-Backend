////////////////////////////////
//      IMPORTS AND SETUP     //
////////////////////////////////

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const mongodbUrl = process.env.MONGODB_URL;

/////////////////////////////
//     AUTHENTICATION      //
/////////////////////////////

app.post("/register", async (request, response) => {
  const { email, password } = request.body;

  const { user, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return response.status(400).json({ error: error.message });
  }

  response.status(200).json({ user });
});

app.post("/login", async (request, response) => {
  const { email, password } = request.body;

  const { user, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return response.status(400).json({ error: error.message });
  }

  response.status(200).json({ user });
});

app.get("/check-auth", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const { data, error } = await supabase.auth.api.getUser(token);

  if (error || !data) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.status(200).json({ uid: data.id });
});

app.get("/getsession", async (req, res) => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { session, user } = data;

  if (!session) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  res.status(200).json({ session });
});

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

////////////////////////////////
//          Contacts          //
////////////////////////////////

app.post("/addToContact", async (req, res) => {
  const { userA, userB } = req.body;

  const { data, error: selectError } = await supabase
    .from("Contacts")
    .select("*")
    .eq("uuid", userA)
    .single();

  if (selectError && selectError.code !== "PGRST116") {
    return res.status(500).json({ error: selectError.message });
  }

  let updatedContacts;

  if (data) {
    const currentContacts = data.contacts || [];
    if (!currentContacts.includes(userB)) {
      updatedContacts = [...currentContacts, userB];
      const { data: verify, error: updateError } = await supabase
        .from("Contacts")
        .update({ contacts: updatedContacts })
        .eq("uuid", userA)
        .select();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
    }
  } else {
    updatedContacts = [userB];
    const { error: insertError } = await supabase
      .from("Contacts")
      .insert({ uuid: userA, contacts: updatedContacts });

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }
  }

  return res.status(200).json({ success: true });
});

app.post("/removeFromContact", async (req, res) => {
  const { userA, userB } = req.body;

  const { data, error: selectError } = await supabase
    .from("Contacts")
    .select("contacts")
    .eq("uuid", userA)
    .single();

  if (selectError || !data) {
    return res.status(400).json({ error: "User not found or fetch failed" });
  }

  const currentContacts = data.contacts || [];
  const updatedContacts = currentContacts.filter(
    (contact) => contact !== userB
  );

  const { error: updateError } = await supabase
    .from("Contacts")
    .update({ contacts: updatedContacts })
    .eq("uuid", userA);

  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  return res.status(200).json({ success: true });
});
