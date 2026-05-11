export default function config(){
    return {
        apiBase: process.env.API_BASE || 'http://localhost:3000',
    }
}