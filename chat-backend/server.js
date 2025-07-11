require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Chat Backend is running with OpenRouter API' });
});

// AI Chat endpoint using OpenRouter API with DeepSeek Chat
app.post('/api/chat', async (req, res) => {
  const { messages, userContext } = req.body;

  try {
    console.log('Attempting OpenRouter API call with DeepSeek Chat');
    console.log('User messages:', messages);
    console.log('User context available:', !!userContext);
    
    // Build personalized system prompt based on user context
    let systemPrompt = `
You are a kind, caring AI health assistant helping an elderly person.

FORMAT RULES – FOLLOW THESE EXACTLY:
• Give up to 5 bullet points depending on the user's needs, use all 5 when needed, otherwise, shorter answers are preferred.
• Each bullet must be one short, clear sentence.
• Do not use long sentences, sub-bullets, or paragraphs.
• Use simple, everyday words that a grandparent would understand.
• Try to use emojies as much as possible.
• Do not use medical jargon or technical terms.
• Start each bullet with a clear action or fact and bold it.
• Be warm, respectful, and supportive — never sound cold or robotic.

REMEMBER: Short, clear, and kind — every time.
`;
    
    if (userContext && userContext.completedSections && userContext.completedSections.length > 0) {
      systemPrompt += '\n\nIMPORTANT: You are a medical advisor for an elderly person who has completed a health assessment. Use the following information about this person to provide personalized, relevant advice:';
      
      // Add user's health assessment data
      Object.entries(userContext.responses).forEach(([section, questions]) => {
        systemPrompt += `\n\n**${section.charAt(0).toUpperCase() + section.slice(1)} Assessment:**`;
        Object.entries(questions).forEach(([question, answer]) => {
          systemPrompt += `\n- ${question}: ${answer}`;
        });
      });
      
      systemPrompt += '\n\nWhen providing advice, consider this person\'s specific health situation, concerns, and needs. Tailor your recommendations to their mobility level, medication concerns, mental health status, and what matters most to them. Be empathetic and supportive while providing practical, actionable advice.';
    }
    
    // Log the system prompt for debugging (do not log userContext separately)
    console.log('==== SYSTEM PROMPT SENT TO AI ====');
    console.log(systemPrompt);
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 300,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': '4Ms Health Questionnaire App'
        }
      }
    );

    console.log('✅ OpenRouter API Response:', response.data);
    
    const assistantMessage = response.data.choices[0]?.message?.content || 
                            'I apologize, but I couldn\'t generate a response at the moment.';

    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantMessage
        }
      }]
    });

  } catch (error) {
    console.error('❌ OpenRouter API Error:', error.response?.data || error.message);
    console.error('Error status:', error.response?.status);
    
    // Provide a fallback response instead of error
    const fallbackResponses = [
      "I'm here to help with your health questions! What would you like to know about exercise, nutrition, or general wellness?",
      "I'd be happy to assist you with health-related topics. Feel free to ask about physical activity, sleep, stress management, or other wellness concerns.",
      "Hello! I'm your AI health assistant. I can help you with questions about staying healthy, exercise tips, nutrition advice, and general wellness. What's on your mind?",
      "Welcome! I'm here to support your health journey. Whether you have questions about fitness, diet, mental health, or general wellness, I'm ready to help.",
      "Hi there! I'm your friendly AI health companion. I can provide information about healthy living, exercise recommendations, nutrition tips, and wellness advice. What would you like to discuss?"
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: randomResponse
        }
      }]
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 AI Chat Backend server running on port ${PORT}`);
  console.log(`📡 Using OpenRouter API with DeepSeek Chat model`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
}); 