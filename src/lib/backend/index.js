import * as demoAuth from './auth';
import * as fbAuth from './firebase/auth';
import * as demoOrders from './orders';
import * as fbOrders from './firebase/orders';
import * as demoNotifications from './notifications';
import * as fbNotifications from './firebase/notifications';
import * as demoChat from './chat';
import * as fbChat from './firebase/chat';
import * as demoLeaderboard from './leaderboard';
import * as fbLeaderboard from './firebase/leaderboard';

// Switch backends via VITE_BACKEND=demo|firebase in .env
const useFirebase = import.meta.env.VITE_BACKEND === 'firebase';

export const isFirebase = useFirebase;

export const auth = useFirebase ? fbAuth : demoAuth;
export const orders = useFirebase ? fbOrders : demoOrders;
export const notifications = useFirebase ? fbNotifications : demoNotifications;
export const chat = useFirebase ? fbChat : demoChat;
export const leaderboard = useFirebase ? fbLeaderboard : demoLeaderboard;
