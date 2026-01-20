import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/auth': 'http://localhost:4000',
            '/wallet': 'http://localhost:4000',
            '/profile': 'http://localhost:4000',
            '/messages': 'http://localhost:4000',
            '/session': 'http://localhost:4000',
            '/payment': 'http://localhost:4000',
            '/socket.io': {
                target: 'http://localhost:4000',
                ws: true
            }
        }
    }
});
