import amqb from "amqplib";
import logger from "./logger.js";

let connection = null;
let channel = null;

const EXCHANGE_NAME = "social_media";
const EXCHANGE_TYPE = "topic";

export const connectToRabbitMQ = async () => {
  try {
    connection = await amqb.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: false,
    });
    logger.info("Connected to RabbitMQ");
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", error);
  }
};


export const consumeMessage = async (routingKey, callback) => {
  if (!channel) {
    await connectToRabbitMQ();
  }
  try {
    const queue = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(queue.queue, EXCHANGE_NAME, routingKey);
    channel.consume(queue.queue, (msg) => {
      if (msg === null) return;
      const message = JSON.parse(msg.content.toString());
      callback(message);
      channel.ack(msg);
    });
    logger.info("Started consuming messages");
  } catch (error) {
    logger.error("Failed to consume message", error);
  }
};
