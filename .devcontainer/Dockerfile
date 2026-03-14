# ═══════════════════════════════════════════════════════════════
# Tada Dev Container - Optimized for Nuxt 3 + Bun
# ═══════════════════════════════════════════════════════════════

FROM oven/bun:1

# ═══════════════════════════════════════════════════════════════
# SYSTEM PACKAGES
# ═══════════════════════════════════════════════════════════════

# Install power-user CLI tools + dependencies
RUN apt-get update && apt-get install -y \
    # Core utilities
    git \
    curl \
    wget \
    ca-certificates \
    gnupg \
    # Shell enhancements
    zsh \
    bash-completion \
    # Search & filtering
    fzf \
    ripgrep \
    # Modern replacements
    bat \
    # Build tools (for some npm packages)
    build-essential \
    python3 \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# INSTALL GITHUB CLI
# ═══════════════════════════════════════════════════════════════

RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# INSTALL EZA (modern ls replacement)
# ═══════════════════════════════════════════════════════════════

RUN wget -qO- https://github.com/eza-community/eza/releases/latest/download/eza_x86_64-unknown-linux-gnu.tar.gz | tar xz -C /usr/local/bin

# ═══════════════════════════════════════════════════════════════
# ZSH SETUP
# ═══════════════════════════════════════════════════════════════

# Install zsh plugins
RUN git clone https://github.com/zsh-users/zsh-autosuggestions /usr/share/zsh/plugins/zsh-autosuggestions && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting /usr/share/zsh/plugins/zsh-syntax-highlighting

# ═══════════════════════════════════════════════════════════════
# STARSHIP PROMPT
# ═══════════════════════════════════════════════════════════════

RUN curl -sS https://starship.rs/install.sh | sh -s -- -y

# ═══════════════════════════════════════════════════════════════
# USER CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Switch to bun user (matches base image)
USER bun
WORKDIR /home/bun

# ═══════════════════════════════════════════════════════════════
# ZSH CONFIGURATION (.zshrc)
# ═══════════════════════════════════════════════════════════════

RUN echo '# ═══════════════════════════════════════════════════════════════' >> ~/.zshrc && \
    echo '# Tada Dev Container - ZSH Configuration' >> ~/.zshrc && \
    echo '# ═══════════════════════════════════════════════════════════════' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# PERSISTENT COMMAND HISTORY (bind mount from host)' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'export HISTFILE=/commandhistory/.zsh_history' >> ~/.zshrc && \
    echo 'export HISTSIZE=50000' >> ~/.zshrc && \
    echo 'export SAVEHIST=50000' >> ~/.zshrc && \
    echo 'setopt HIST_IGNORE_DUPS' >> ~/.zshrc && \
    echo 'setopt HIST_IGNORE_ALL_DUPS' >> ~/.zshrc && \
    echo 'setopt HIST_FIND_NO_DUPS' >> ~/.zshrc && \
    echo 'setopt SHARE_HISTORY' >> ~/.zshrc && \
    echo 'setopt APPEND_HISTORY' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# ZSH COMPLETION' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'autoload -Uz compinit' >> ~/.zshrc && \
    echo 'compinit' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# ZSH PLUGINS' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh' >> ~/.zshrc && \
    echo 'source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# FZF INTEGRATION (Ctrl-R for history search)' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'source /usr/share/doc/fzf/examples/key-bindings.zsh' >> ~/.zshrc && \
    echo 'source /usr/share/doc/fzf/examples/completion.zsh' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# ALIASES' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'alias ls="eza --icons"' >> ~/.zshrc && \
    echo 'alias ll="eza --icons -la"' >> ~/.zshrc && \
    echo 'alias la="eza --icons -a"' >> ~/.zshrc && \
    echo 'alias cat="bat"' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# STARSHIP PROMPT' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo 'eval "$(starship init zsh)"' >> ~/.zshrc && \
    echo '' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# PROJECT-SPECIFIC SETUP' >> ~/.zshrc && \
    echo '# ───────────────────────────────────────────────────────────────' >> ~/.zshrc && \
    echo '# Auto-cd to app/ directory for convenience (optional)' >> ~/.zshrc && \
    echo '# Uncomment if you want the terminal to start in app/' >> ~/.zshrc && \
    echo '# cd /workspaces/tada/app' >> ~/.zshrc

# ═══════════════════════════════════════════════════════════════
# STARSHIP CONFIGURATION
# ═══════════════════════════════════════════════════════════════

RUN mkdir -p ~/.config && \
    echo '# Tada Dev Container - Starship Configuration' > ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo 'format = """' >> ~/.config/starship.toml && \
    echo '[┌─](bold green)$directory$git_branch$git_status$nodejs$bun' >> ~/.config/starship.toml && \
    echo '[└─](bold green)$character"""' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[character]' >> ~/.config/starship.toml && \
    echo 'success_symbol = "[➜](bold green)"' >> ~/.config/starship.toml && \
    echo 'error_symbol = "[✗](bold red)"' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[directory]' >> ~/.config/starship.toml && \
    echo 'truncation_length = 3' >> ~/.config/starship.toml && \
    echo 'truncate_to_repo = true' >> ~/.config/starship.toml && \
    echo 'style = "bold cyan"' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[git_branch]' >> ~/.config/starship.toml && \
    echo 'symbol = " "' >> ~/.config/starship.toml && \
    echo 'style = "bold purple"' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[git_status]' >> ~/.config/starship.toml && \
    echo 'style = "bold yellow"' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[nodejs]' >> ~/.config/starship.toml && \
    echo 'symbol = " "' >> ~/.config/starship.toml && \
    echo 'style = "bold green"' >> ~/.config/starship.toml && \
    echo '' >> ~/.config/starship.toml && \
    echo '[bun]' >> ~/.config/starship.toml && \
    echo 'symbol = "🥟 "' >> ~/.config/starship.toml && \
    echo 'style = "bold red"' >> ~/.config/starship.toml

# ═══════════════════════════════════════════════════════════════
# FINALIZE
# ═══════════════════════════════════════════════════════════════

# Set default shell to zsh
SHELL ["/bin/zsh", "-c"]

# Default working directory (will be overridden by devcontainer.json)
WORKDIR /workspaces/tada
