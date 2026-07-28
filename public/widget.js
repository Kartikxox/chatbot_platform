(function() {
  // Get the brand_id from the script tag that loaded this file
  const scriptTag = document.currentScript;
  const BRAND_ID = scriptTag.getAttribute('data-brand-id');
  const API_URL = "http://localhost:3000/api/chat";

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #cb-bubble {
      position: fixed; bottom: 20px; right: 20px;
      width: 60px; height: 60px; border-radius: 50%;
      background: #222; color: white; display: flex;
      align-items: center; justify-content: center;
      cursor: pointer; font-size: 24px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 9999;
    }
    #cb-window {
      position: fixed; bottom: 90px; right: 20px;
      width: 300px; height: 400px; background: white;
      border-radius: 10px; box-shadow: 0 2px 20px rgba(0,0,0,0.3);
      display: none; flex-direction: column; overflow: hidden;
      z-index: 9999; font-family: sans-serif;
    }
    #cb-messages { flex: 1; padding: 10px; overflow-y: auto; }
    .cb-bot-message {
      background: #f0f0f0; padding: 8px 12px; border-radius: 10px;
      margin-bottom: 10px; max-width: 80%;
    }
    .cb-option-btn {
      display: block; width: 100%; padding: 8px; margin-bottom: 6px;
      background: #222; color: white; border: none; border-radius: 6px;
      cursor: pointer; text-align: left;
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const bubble = document.createElement('div');
  bubble.id = 'cb-bubble';
  bubble.textContent = '💬';

  const chatWindow = document.createElement('div');
  chatWindow.id = 'cb-window';
  chatWindow.innerHTML = '<div id="cb-messages"></div>';

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  const messagesDiv = chatWindow.querySelector('#cb-messages');

  let currentNode = null;
  let hasStarted = false;

  bubble.addEventListener('click', () => {
    const isOpen = chatWindow.style.display === 'flex';
    chatWindow.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen && !hasStarted) {
      hasStarted = true;
      sendMessage(null);
    }
  });

  async function sendMessage(selectedOption) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: BRAND_ID,
        current_node: currentNode,
        selected_option: selectedOption
      })
    });
    const data = await response.json();
    currentNode = data.node_key;
    renderNode(data.message, data.options);
  }

  function renderNode(message, options) {
    const msgEl = document.createElement('div');
    msgEl.className = 'cb-bot-message';
    msgEl.textContent = message;
    messagesDiv.appendChild(msgEl);

    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'cb-option-btn';
      btn.textContent = option;
      btn.onclick = () => sendMessage(option);
      messagesDiv.appendChild(btn);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
})();