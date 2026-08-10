// Firebase SDK 없이 REST API로 직접 통신
export const DB_URL = 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

export const rtdb = {
  ref: (path: string) => `${DB_URL}/${path}.json`,
};

export const ref = (db: any, path: string) => path;

export const set = async (path: string, data: any) => {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const update = async (path: string, data: any) => {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const onValue = (path: string, callback: (snapshot: any) => void) => {
  const url = `${DB_URL}/${path}.json`;
  const fetchData = async () => {
    const res = await fetch(url);
    const data = await res.json();
    callback({ val: () => data });
  };
  fetchData();
  const interval = setInterval(fetchData, 3000);
  return () => clearInterval(interval);
};

export const auth = null;
export default {};
