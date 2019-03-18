import {
  confirmFirebaseConfigurationEnvVars,
  confirmLocalFirebaseConfigurationEnvVars,
  devAndTestingEnvironments,
  FIREBASE_CONFIGURATION_ENV_KEYS,
  FirebaseServiceFactory,
  MNEMONIC_PATH,
  Node
} from "@counterfactual/node";
import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { fromExtendedKey } from "ethers/utils/hdnode";

import {
  afterUser,
  buildRegistrationSignaturePayload,
  createAccount,
  deposit,
  fetchMultisig,
  getUser,
  UserSession
} from "./utils";

const provider = new JsonRpcProvider("https://kovan.infura.io/metamask");

const BASE_URL = process.env.BASE_URL!;
const TOKEN_PATH = "HR_USER_TOKEN";

let serviceFactory: FirebaseServiceFactory;
console.log(`Using Firebase configuration for ${process.env.NODE_ENV}`);
if (!devAndTestingEnvironments.has(process.env.NODE_ENV!)) {
  confirmFirebaseConfigurationEnvVars();
  serviceFactory = new FirebaseServiceFactory({
    apiKey: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.apiKey]!,
    authDomain: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.authDomain]!,
    databaseURL: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.databaseURL]!,
    projectId: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.projectId]!,
    storageBucket: process.env[FIREBASE_CONFIGURATION_ENV_KEYS.storageBucket]!,
    messagingSenderId: process.env[
      FIREBASE_CONFIGURATION_ENV_KEYS.messagingSenderId
    ]!
  });
} else {
  confirmLocalFirebaseConfigurationEnvVars();
  const firebaseServerHost = process.env.FIREBASE_SERVER_HOST;
  const firebaseServerPort = process.env.FIREBASE_SERVER_PORT;
  serviceFactory = new FirebaseServiceFactory({
    apiKey: "",
    authDomain: "",
    databaseURL: `ws://${firebaseServerHost}:${firebaseServerPort}`,
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
  });
}

let node: Node;

(async () => {
  const store = serviceFactory.createStoreService("hrBotStore1");

  await store.set([{ key: MNEMONIC_PATH, value: process.env.NODE_MNEMONIC }]);

  const messService = serviceFactory.createMessagingService("messaging");
  node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    provider,
    "kovan"
  );

  console.log(`Node Public Identifier: ${node.publicIdentifier}`);
  console.log(
    `0th derived key: ${
      fromExtendedKey(node.publicIdentifier).derivePath("0").address
    }`
  );

  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw Error("No private key specified in env. Exiting.");
    }
    const wallet = new Wallet(privateKey, provider);
    const user = {
      email: "HighRollerBot",
      ethAddress: wallet.address,
      nodeAddress: node.publicIdentifier,
      username: "HighRollerBot"
    };
    const signature = await wallet.signMessage(
      buildRegistrationSignaturePayload(user)
    );

    let bot: UserSession;
    let token = await store.get(TOKEN_PATH);
    if (token) {
      console.log(
        `Getting pre-existing user ${user.username} account: ${token}`
      );
      try {
        bot = await getUser(BASE_URL, token);
      } catch (e) {
        console.log("Failed to get user");
        console.error(e);
      }
    } else {
      bot = await createAccount(BASE_URL, user, signature);
      token = bot.token;
      await store.set([
        {
          key: TOKEN_PATH,
          value: token!
        }
      ]);
      console.log(`Account created\n`, bot);
    }
    try {
      const multisigAddress = await fetchMultisig(BASE_URL, token!);
      console.log("Account multisig address:", multisigAddress);

      if (process.env.DEPOSIT_AMOUNT) {
        await deposit(node, process.env.DEPOSIT_AMOUNT, multisigAddress);
      }

      afterUser(user.username, node, bot.nodeAddress, multisigAddress);
    } catch (e) {
      console.log("failed to proceed");
      console.error(e);
    }
  } catch (e) {
    console.error("\n");
    console.error(e);
    console.error("\n");
    process.exit(1);
  }
})();
