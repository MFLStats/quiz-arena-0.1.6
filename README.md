# Trivium Arena

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MFLStats/quiz-arena)

**Trivium Arena** is a high-octane, visually immersive 1v1 real-time PvP quiz platform designed to test knowledge speed and accuracy. The application centers around short, intense 'Arena Matches' where players duel in specific categories (Science, History, Pop Culture, etc.).

Built on Cloudflare Workers and Durable Objects, Trivium Arena delivers low-latency, real-time gameplay with a stunning "Glassmorphism" and "Neon-Dark" aesthetic.

## 🚀 Key Features

-   **The Arena (Game Loop):** A visually stunning game interface featuring 5 rapid-fire questions with accurate timers and immediate feedback.
-   **Category Ecosystem:** A grid-based selection screen where each category tracks its own Elo rating and progression.
-   **Real-Time Matchmaking:** Powered by Cloudflare Durable Objects to queue players based on category-specific Elo ratings.
-   **Stats & Progression:** Comprehensive profile views visualizing reaction times, win rates, and global rankings.
-   **Visual Excellence:** Built with a modern aesthetic utilizing smooth Framer Motion transitions and responsive design.

## 🛠️ Tech Stack

This project leverages a modern, high-performance stack:

-   **Frontend:** React 18, React Router 6, TypeScript
-   **Styling:** Tailwind CSS, ShadCN UI, Framer Motion, Lucide React
-   **State Management:** Zustand
-   **Backend:** Cloudflare Workers (Hono framework)
-   **Persistence:** Cloudflare Durable Objects (Single-instance storage pattern)
-   **Build Tool:** Vite

## 📦 Installation & Setup

This project uses `bun` for package management. Ensure you have Bun installed before proceeding.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/trivium-arena.git
    cd trivium-arena
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Start the development server:**
    ```bash
    bun run dev
    ```
    This will start the Vite development server locally.

## 💻 Development

The project structure is organized for scalability:

-   `src/`: Frontend React application code.
-   `worker/`: Cloudflare Worker backend code, including Durable Object definitions.
-   `shared/`: Shared types and utilities between frontend and backend.

### Running Locally

To run the full stack locally (including the Worker simulation):

```bash
bun run dev
```

The application will be available at `http://localhost:3000` (or the port specified in your terminal).

## 🚀 Deployment

Deploying to Cloudflare Workers is seamless.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MFLStats/quiz-arena)

### Manual Deployment

1.  **Build the project:**
    ```bash
    bun run build
    ```

2.  **Deploy to Cloudflare:**
    ```bash
    bun run deploy
    ```

*Note: You must be logged into your Cloudflare account via Wrangler (`npx wrangler login`) before deploying.*

## ⚠️ Important Notes

-   **Durable Objects:** This project relies on Cloudflare Durable Objects. Ensure your Cloudflare account has this feature enabled.
-   **Configuration:** Do not modify `wrangler.jsonc` or the core worker bindings (`GlobalDurableObject`) as the application logic depends on this specific configuration.

## 📄 License

This project is licensed under the MIT License.