import { useState, useEffect } from 'react';
import { notifications } from '../lib/backend';

export function useNotifications(uid) {
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    return notifications.listenNotifications(uid, (n) => {
      setList(n);
      setUnread(n.filter((x) => !x.read).length);
    });
  }, [uid]);

  return { list, unread };
}
