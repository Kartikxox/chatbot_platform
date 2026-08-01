(function() {
  const scriptTag = document.currentScript;
  const BRAND_ID = scriptTag.getAttribute('data-brand-id');
  const CHAT_API_URL = "https://chatbotplatform-production.up.railway.app/api/chat";
  const ASK_API_URL = "https://chatbotplatform-production.up.railway.app/api/ask";

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
      width: 320px; height: 460px; background: white;
      border-radius: 10px; box-shadow: 0 2px 20px rgba(0,0,0,0.3);
      display: none; flex-direction: column; overflow: hidden;
      z-index: 9999; font-family: sans-serif;
    }
    #cb-messages { flex: 1; padding: 10px; overflow-y: auto; }
    .cb-bot-message {
      background: #f0f0f0; padding: 8px 12px; border-radius: 10px;
      margin-bottom: 10px; max-width: 85%; font-size: 14px; line-height: 1.4;
    }
    .cb-user-message {
      background: #222; color: white; padding: 8px 12px; border-radius: 10px;
      margin-bottom: 10px; max-width: 85%; font-size: 14px; margin-left: auto;
    }
    .cb-option-btn {
      display: block; width: 100%; padding: 8px; margin-bottom: 6px;
      background: #222; color: white; border: none; border-radius: 6px;
      cursor: pointer; text-align: left; font-size: 13px;
    }
    #cb-input-row {
      display: flex; border-top: 1px solid #eee; padding: 8px;
      gap: 6px;
    }
    #cb-text-input {
      flex: 1; padding: 8px 10px; border: 1px solid #ddd;
      border-radius: 6px; font-size: 13px; outline: none;
    }
    #cb-send-btn {
      background: #222; color: white; border: none;
      border-radius: 6px; padding: 8px 14px; cursor: pointer; font-size: 13px;
    }
    .cb-typing {
      font-size: 12px; color: #999; padding: 4px 12px;
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const bubble = document.createElement('div');
  bubble.id = 'cb-bubble';
  bubble.textContent = '💬';

  const chatWindow = document.createElement('div');
  chatWindow.id = 'cb-window';
  chatWindow.innerHTML = `
    <div id="cb-messages"></div>
    <div id="cb-input-row">
      <input type="text" id="cb-text-input" placeholder="Type a question..." />
      <button id="cb-send-btn">Send</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  const messagesDiv = chatWindow.querySelector('#cb-messages');
  const textInput = chatWindow.querySelector('#cb-text-input');
  const sendBtn = chatWindow.querySelector('#cb-send-btn');

  let currentNode = null;
  let hasStarted = false;

  bubble.addEventListener('click', () => {
    const isOpen = chatWindow.style.display === 'flex';
    chatWindow.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen && !hasStarted) {
      hasStarted = true;
      sendFlowMessage(null);
    }
  });

  sendBtn.addEventListener('click', handleTextSend);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTextSend();
  });

  async function handleTextSend() {
    const question = textInput.value.trim();
    if (!question) return;

    addUserMessage(question);
    textInput.value = '';

    const typingEl = document.createElement('div');
    typingEl.className = 'cb-typing';
    typingEl.textContent = 'Typing...';
    messagesDiv.appendChild(typingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      const response = await fetch(ASK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: BRAND_ID, question })
      });
      const data = await response.json();
      typingEl.remove();

      if (response.ok) {
        addBotMessage(data.answer);
      } else {
        addBotMessage("Sorry, I couldn't process that. Please try again.");
      }
    } catch (err) {
      typingEl.remove();
      addBotMessage("Something went wrong. Please try again.");
    }
  }

  function addUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'cb-user-message';
    el.textContent = text;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'cb-bot-message';
    el.textContent = text;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function sendFlowMessage(selectedOption) {
    const response = await fetch(CHAT_API_URL, {
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
    renderFlowNode(data.message, data.options);
  }

  function renderFlowNode(message, options) {
    addBotMessage(message);
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'cb-option-btn';
      btn.textContent = option;
      btn.onclick = () => {
        addUserMessage(option);
        sendFlowMessage(option);
      };
      messagesDiv.appendChild(btn);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
})();