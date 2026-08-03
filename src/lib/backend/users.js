import { getUser, updateProfile } from './auth';

export { getUser, updateProfile };

export function getUserById(uid) {
  return getUser(uid);
}
