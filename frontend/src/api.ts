const getAuthHeader = () => {
  const user = localStorage.getItem('user');
  const pass = localStorage.getItem('pass');
  if (user && pass) {
    return { 'Authorization': 'Basic ' + btoa(user + ':' + pass) };
  }
  return {};
};

// 生产环境时，可以在 .env 文件或构建设置中指定 VITE_API_BASE_URL
// 本地开发时默认为空字符串，利用 Vite 代理转发到 /api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  get: async (url: string) => {
    const res = await fetch(BASE_URL + url, { headers: { ...getAuthHeader() } });
    if (res.status === 401) throw new Error('Unauthorized');
    return res.json();
  },
  post: async (url: string, data: any) => {
    const res = await fetch(BASE_URL + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    return res.json();
  },
  put: async (url: string, data: any) => { 
      const res = await fetch(BASE_URL + url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(data)
      });
      if (res.status === 401) throw new Error('Unauthorized');
      return res.json();
  },
  upload: async (url: string, file: File) => {
      const res = await fetch(BASE_URL + url, {
          method: 'PUT',
          headers: { ...getAuthHeader() },
          body: file
      });
      if (res.status === 401) throw new Error('Unauthorized');
      return res.json();
  }
};