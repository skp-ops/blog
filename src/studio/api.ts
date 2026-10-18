import type { APIRoute } from 'astro'
import process from 'node:process'
import { handleStudioRequest } from './server'

export const prerender = false

const handleRequest: APIRoute = ({ request }) => handleStudioRequest(request, process.cwd())

export const GET = handleRequest
export const POST = handleRequest
