import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

/** current working directory */
export const CWD = process.cwd()

const { BACKEND_URL } = process.env

if (!BACKEND_URL) {
  console.error(
    'please set backend url in .env file, e.g. BACKEND_URL=http://localhost:3000',
  )
  process.exit(1)
}

/** backend axios instance */
export const API = axios.create({
  baseURL: BACKEND_URL,
})
