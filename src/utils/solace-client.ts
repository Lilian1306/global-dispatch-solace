import solace from 'solclientjs';
import { SOLACE_CONFIG } from '../config/solace.config';

let isInitialized = false;

function initSolclient(): void {
  if (!isInitialized) {
    const factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);
    isInitialized = true;
  }
}

export class SolaceClient {
  private session: solace.Session | null = null;

  constructor() {
    initSolclient();
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!SOLACE_CONFIG.url || !SOLACE_CONFIG.userName) {
        return reject(new Error('Solace configuration is missing. Check .env variables.'));
      }

      const sessionProperties = new solace.SessionProperties({
        url: SOLACE_CONFIG.url,
        vpnName: SOLACE_CONFIG.vpnName,
        userName: SOLACE_CONFIG.userName,
        password: SOLACE_CONFIG.password
      });

      this.session = solace.SolclientFactory.createSession(sessionProperties);

      this.session.on(solace.SessionEventCode.UP_NOTICE, () => {
        resolve();
      });

      this.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (error: unknown) => {
        reject(error);
      });

      this.session.connect();
    });
  }

  public publish(topicName: string, payload: unknown): void {
    if (!this.session) {
      throw new Error('Cannot publish without an active Solace session.');
    }

    const message = solace.SolclientFactory.createMessage();
    message.setDestination(solace.SolclientFactory.createTopicDestination(topicName));
    message.setBinaryAttachment(JSON.stringify(payload));
    message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);

    this.session.send(message);
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.session) {
        return resolve();
      }

      this.session.on(solace.SessionEventCode.DISCONNECTED, () => {
        this.session = null;
        resolve();
      });

      this.session.disconnect();
    });
  }

  public createQueueConsumer(
    queueName: string,
    onMessage: (message: solace.Message) => void,
    onError?: (error: unknown) => void
  ): Promise<solace.MessageConsumer> {
    return new Promise((resolve, reject) => {
      if (!this.session) {
        return reject(new Error('Cannot create consumer without an active Solace session.'));
      }

      const messageConsumer = this.session.createMessageConsumer({
        queueDescriptor: {
          name: queueName,
          type: solace.QueueType.QUEUE
        },
        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT
      });

      messageConsumer.on(solace.MessageConsumerEventName.UP, () => {
        resolve(messageConsumer);
      });

      messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, (error: unknown) => {
        if (onError) onError(error);
        reject(error);
      });

      messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, (message: solace.Message) => {
        try {
          onMessage(message);
          message.acknowledge();
        } catch (err) {
          console.error(`Error processing message from queue "${queueName}":`, err);
        }
      });

      messageConsumer.connect();
    });
  }

  public getSession(): solace.Session | null {
    return this.session;
  }
}

export function parseMessagePayload<T>(message: solace.Message): T {
  const attachment = message.getBinaryAttachment();
  if (!attachment) {
    throw new Error('Received Solace message has no payload or binary attachment.');
  }
  const text =
    typeof attachment === 'string'
      ? attachment
      : Buffer.from(attachment).toString('utf-8');
  return JSON.parse(text) as T;
}
