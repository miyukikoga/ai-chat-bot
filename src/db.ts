import { connect } from '@planetscale/database';

const config = {
  host: 'aws.connect.psdb.cloud',
  username: process.env.PS_USERNAME,
  password: process.env.PS_PASSWORD,
};

/**
 * スレッドのメッセージリストを取得する
 * @param threadTs スレッドのタイムスタンプ
 * @returns スレッドのメッセージ
 */
export const fetchThreadMessages = async (
  threadTs: string,
): Promise<{ user: string; ai: string }[]> => {
  const conn = await connect(config);
  const query =
    'SELECT user_message, ai_message ' +
    'FROM chat_histories ' +
    'WHERE thread_ts = ? ORDER BY created_at';
  const results = await conn.execute(query, [threadTs]);
  return results.rows.map((row) => {
    return {
      user: row.user_message as string,
      ai: row.ai_message as string,
    };
  });
};

/**
 * メッセージを登録する
 * @param args.threadTs スレッドのタイムスタンプ
 * @param args.channel チャンネルID
 * @param args.userMessage ユーザーのメッセージ
 * @param args.aiMessage AIのメッセージ
 */
export const saveThreadMessages = async (args: {
  threadTs: string;
  channel: string;
  userMessage: string;
  aiMessage: string;
}): Promise<void> => {
  const params = [
    args.threadTs,
    args.channel,
    args.userMessage,
    args.aiMessage,
  ];
  const conn = await connect(config);
  await conn.transaction(async (tx) => {
    const query =
      'INSERT INTO chat_histories ' +
      '(`thread_ts`, `channel`, `user_message`, `ai_message`) ' +
      'VALUES (?, ?, ?, ?)';
    return await tx.execute(query, params);
  });
};
