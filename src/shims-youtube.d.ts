declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string | HTMLElement, options: YT.PlayerOptions) => YT.Player;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }

  namespace YT {
    interface PlayerOptions {
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: OnReadyEvent) => void;
        onStateChange?: (event: OnStateChangeEvent) => void;
        onError?: (event: OnErrorEvent) => void;
      };
    }

    interface Player {
      destroy(): void;
      getCurrentTime(): number;
      loadVideoById(options: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
      pauseVideo(): void;
      playVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
    }

    interface OnReadyEvent {
      target: Player;
    }

    interface OnStateChangeEvent {
      data: number;
      target: Player;
    }

    interface OnErrorEvent {
      data: number;
      target: Player;
    }
  }
}

export {};
