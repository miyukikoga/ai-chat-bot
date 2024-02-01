import { App } from '@slack/bolt';
import OpenAI from 'openai';
import { MESSAGES } from './constants/messages';
import { PROMPTS } from './constants/prompts';
import { fetchThreadMessages, saveThreadMessages } from './db';

const openai = new OpenAI();

// ボットトークンと Signing Secret を使ってアプリを初期化します
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.event('app_mention', async ({ event, say }) => {
  console.log({ event });
  const threadTs = event.thread_ts ? event.thread_ts : event.ts;

  try {
    const fetchResult = await fetchThreadMessages(threadTs);

    const pastThreadMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      fetchResult
        .map((message) => [
          {
            role: 'user',
            content: message.user,
          } as const satisfies OpenAI.Chat.ChatCompletionMessageParam,
          {
            role: 'assistant',
            content: message.ai,
          } as const satisfies OpenAI.Chat.ChatCompletionMessageParam,
        ])
        .reduce((acc, value) => acc.concat(value), []);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      [
        {
          role: 'system',
          content: PROMPTS.personality,
        } as const satisfies OpenAI.Chat.ChatCompletionMessageParam,
      ],
      pastThreadMessages,
      [
        {
          role: 'user',
          content: event.text,
        } as const satisfies OpenAI.Chat.ChatCompletionMessageParam,
      ],
    ].reduce((acc, value) => acc.concat(value), []);
    console.log({ messages });

    const completion = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-4',
    });

    const content = completion.choices[0].message.content;

    await saveThreadMessages({
      threadTs: threadTs,
      channel: event.channel,
      userMessage: event.text,
      aiMessage: content || '',
    });
    await say({
      text: `<@${event.user}> ${content}`,
      thread_ts: threadTs,
    });
  } catch (err) {
    console.error('app_mention event is failed.');
    console.error(err);
    await say({
      text: `<@${event.user}> ${MESSAGES.chatError}`,
      thread_ts: threadTs,
    });
  }
});

(async () => {
  // アプリを起動します
  await app.start(Number(process.env.PORT) || 3000);

  console.log('⚡️ Bolt app is running!');
})();
