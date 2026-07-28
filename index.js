require('dotenv').config();
const express = require('express');
const pool = require('./db');
const cors = require('cors');

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});