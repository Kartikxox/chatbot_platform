require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const express = require('express');
const pool = require('./db');
const cors = require('cors');
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

const app = express();
app.use(cors());
app.use(express.json()); // lets Express understand JSON sent from the widget
app.use(express.static('public'));

// This is the main "brain" endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { brand_id, current_node, selected_option } = req.body;

    // 1. Get the brand's flow from the database
    const result = await pool.query(
      'SELECT flow_json FROM flows WHERE brand_id = $1 LIMIT 1',
      [brand_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No flow found for this brand' });
    }

    const flow = result.rows[0].flow_json;

    // 2. Figure out which node to show
    // If no current_node is sent, always start at "start"
    let nodeKey = current_node || 'start';

    // If the user clicked an option, move to whatever node it points to
    if (selected_option) {
      const currentNodeData = flow[nodeKey];
      const chosenOption = currentNodeData.options.find(
        (opt) => opt.label === selected_option
      );
      if (chosenOption) {
        nodeKey = chosenOption.next;
      }
    }

    const node = flow[nodeKey];

    // 3. Send back the message + options for this node
    res.json({
      node_key: nodeKey,
      message: node.message,
      options: node.options.map((opt) => opt.label)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// Get a brand's flow (for the admin dashboard)
app.get('/api/flows/:brand_id', async (req, res) => {
  try {
    const { brand_id } = req.params;
    const result = await pool.query(
      'SELECT id, flow_json FROM flows WHERE brand_id = $1 LIMIT 1',
      [brand_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No flow found for this brand' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Update a brand's flow (for the admin dashboard)
app.post('/api/flows/:brand_id', async (req, res) => {
  try {
    const { brand_id } = req.params;
    const { flow_json } = req.body;

    const result = await pool.query(
      'UPDATE flows SET flow_json = $1 WHERE brand_id = $2 RETURNING *',
      [flow_json, brand_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No flow found for this brand' });
    }

    res.json({ success: true, flow: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// AI-powered Q&A using the brand's knowledge base
app.post('/api/ask', async (req, res) => {
  try {
    const { brand_id, question } = req.body;

    // 1. Get the brand's knowledge base
    const result = await pool.query(
      'SELECT name, knowledge_base FROM brands WHERE id = $1',
      [brand_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const { name, knowledge_base } = result.rows[0];

    // 2. Ask Gemini, giving it the knowledge base as context
    const prompt = `You are a helpful customer support assistant for ${name}. Answer questions using ONLY the following information. If the answer isn't in this information, politely say you're not sure and suggest they contact the brand directly. Keep answers short and friendly, 2-3 sentences max.

Brand info:
${knowledge_base}

Customer question: ${question}`;

    const result2 = await model.generateContent(prompt);
    const answer = result2.response.text();

    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});