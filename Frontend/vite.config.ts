import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true'
const pagesBasePath =
  isGitHubActionsBuild && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base: pagesBasePath,
  plugins: [react()],
})
