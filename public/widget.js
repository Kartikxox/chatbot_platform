(function() {
  const scriptTag = document.currentScript;
  const BRAND_ID = scriptTag.getAttribute('data-brand-id');
  const CHAT_API_URL = "https://chatbotplatform-production.up.railway.app/api/chat";
  const ASK_API_URL = "https://chatbotplatform-production.up.railway.app/api/ask";

  const style = document.createElement('style');
  style.textContent = `
    #cb-bubble {
      position: fixed; bottom: 20px; right: 20px;
      width: 58px; height: 58px; border-radius: 50%;
      background: #C6A15B; color: #17150F; display: flex;
      align-items: center; justify-content: center;
      cursor: pointer; font-size: 22px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 9999;
      transition: transform 0.15s ease;
    }
    #cb-bubble:hover { transform: scale(1.05); }
    #cb-window {
      position: fixed; bottom: 90px; right: 20px;
      width: 330px; height: 470px; background: #171513;
      border: 1px solid #2B2824;
      border-radius: 6px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: none; flex-direction: column; overflow: hidden;
      z-index: 9999; font-family: 'Inter', sans-serif;
    }
    #cb-header {
      padding: 16px 18px; border-bottom: 1px solid #2B2824;
      font-family: 'Cormorant Garamond', serif; font-size: 18px;
      font-weight: 600; color: #F4EFE6; letter-spacing: 0.02em;
    }
    #cb-header span { color: #C6A15B; }
    #cb-messages { flex: 1; padding: 14px; overflow-y: auto; }
    .cb-bot-message {
      background: #201D19; color: #E8E2D6; border: 1px solid #2B2824;
      padding: 10px 13px; border-radius: 4px;
      margin-bottom: 10px; max-width: 88%; font-size: 13.5px; line-height: 1.5;
    }
    .cb-user-message {
      background: #C6A15B; color: #17150F; padding: 10px 13px; border-radius: 4px;
      margin-bottom: 10px; max-width: 88%; font-size: 13.5px; margin-left: auto;
      line-height: 1.5;
    }
    .cb-option-btn {
      display: block; width: 100%; padding: 10px 12px; margin-bottom: 7px;
      background: transparent; color: #C6A15B; border: 1px solid #3A362F;
      border-radius: 4px; cursor: pointer; text-align: left; font-size: 13px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .cb-option-btn:hover { border-color: #C6A15B; background: rgba(198,161,91,0.08); }
    #cb-input-row {
      display: flex; border-top: 1px solid #2B2824; padding: 10px;
      gap: 8px; background: #171513;
    }
    #cb-text-input {
      flex: 1; padding: 9px 11px; border: 1px solid #2B2824;
      background: #0E0D0C; color: #F4EFE6;
      border-radius: 4px; font-size: 13px; outline: none;
    }
    #cb-text-input::placeholder { color: #6B655C; }
    #cb-text-input:focus { border-color: #C6A15B; }
    #cb-send-btn {
      background: #C6A15B; color: #17150F; border: none;
      border-radius: 4px; padding: 9px 16px; cursor: pointer;
      font-size: 12.5px; font-weight: 600; letter-spacing: 0.02em;
    }
    #cb-send-btn:hover { background: #D4B173; }
    .cb-typing {
      font-size: 12px; color: #6B655C; padding: 4px 4px 10px;
      font-style: italic;
    }
    #cb-messages::-webkit-scrollbar { width: 6px; }
    #cb-messages::-webkit-scrollbar-thumb { background: #2B2824; border-radius: 3px; }
  `;
  document.head.appendChild(style);

  const bubble = document.createElement('div');
  bubble.id = 'cb-bubble';
  bubble.innerHTML = '&#10022;';

  const chatWindow = document.createElement('div');
  chatWindow.id = 'cb-window';
  chatWindow.innerHTML = `
    <div id="cb-header">Rio<span>Rabbit</span></div>
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