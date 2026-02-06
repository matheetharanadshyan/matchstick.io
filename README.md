# Matchstick.io: Encrypted Conversations, Designed To Disappear

<video src="[public/Matchstick.mp4](https://github.com/matheetharanadshyan/matchstick.io/raw/main/public/Matchstick.mp4)" controls width="740"></video>

Matchstick.io is an online privacy focused communication tool that allows individuals to communicate securely and anonymously via the Internet. Individuals can create temporary, ephemeral rooms and share access links with other individuals, allowing real-time interaction without the necessity for an account creation or long-term data storage.

## Getting Started: Pre-Requisites And Installation And Configuration

The following instructions detail the procedure to clone the Matchstick.io repository and configure the repository for local development.

### Pre-Requisites

1. Install the Bun package manager from the [official website](https://bun.com/)

    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2. Ensure the Bun package manager is installed on your local environment

    ```bash
    bun --version
    ```

### Installation And Configuration

1. Clone the remote repository from GitHub to your local environment

    ```bash
    git clone https://github.com/matheetharanadshyan/matchstick.io.git
    ```

2. Navigate into the cloned repository and install the necessary packages and dependencies

    ```bash
    cd matchstick.io && bun install
    ```

3. Replace the existing placeholders in the `.env` file with your Upstash credentials

    ```bash
    UPSTASH_REDIS_REST_URL = "Enter Your Upstash Redis Rest URL"
    UPSTASH_REDIS_REST_TOKEN = "Enter Your Upstash Redis Rest Token"
    ```

4. Run the development server on Localhost on the network port 3000 And view the website on the browser

    ```bash
    bun run dev
    ```

## License

This repository is distributed under the MIT license. See `LICENSE` for more information
