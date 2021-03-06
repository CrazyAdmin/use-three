import React, { useRef, useCallback, useEffect } from "react";
import * as THREE from "three";

export interface Store {
  [key: string]: any;
}

export interface Context {
  store: Store;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  manager: THREE.LoadingManager;
  [type: string]: any;
}

export interface EventsArguments {
  onStart?: (ctx: Context) => void;
  onUpdate?: (ctx: Context, deltaTime: number) => void;
  onDestroy?: (ctx: Context) => void;
  onLoad?: (ctx: Context) => void;
  onLoadError?: (ctx: Context, url: string) => void;
  onLoadProgress?: (
    ctx: Context,
    item: any,
    loaded: number,
    total: number
  ) => void;
}

interface ContextArguments {
  store?: Store;
  scene?: THREE.Scene;
  renderer?: THREE.WebGLRenderer;
  camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  manager?: THREE.LoadingManager;
  [type: string]: any;
}

const useThree = (
  events: EventsArguments = {},
  context: ContextArguments = {}
) => {
  const ref = useRef<HTMLInputElement>();
  const storage = useRef<Context>({} as any);
  const store = useRef<Store>(context.store || {});
  const element = useRef<Function>((props: object) =>
    React.createElement("div", { ...props, ref })
  );

  const frameId = useRef<number>();
  const scene = useRef<THREE.Scene>();
  const camera = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera>();
  const renderer = useRef<THREE.WebGLRenderer>();
  const manager = useRef<THREE.LoadingManager>();
  const deltaTime = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const callbacks = useRef<EventsArguments>(events);

  const createRenderer = () => {
    if (context.webgl2) {
      const canvas = document.createElement("canvas");
      const canvasContext = canvas.getContext("webgl2");

      return new THREE.WebGLRenderer({
        canvas,
        context: canvasContext || undefined
      });
    } else {
      return new THREE.WebGLRenderer();
    }
  };

  useEffect(() => {
    callbacks.current = events;

    if (ref.current) {
      const width = ref.current.clientWidth;
      const height = ref.current.clientHeight;
      const aspect = width / height;

      scene.current = context.scene || new THREE.Scene();
      renderer.current = context.renderer || new THREE.WebGLRenderer();
      camera.current =
        context.camera || new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      manager.current = context.manager || new THREE.LoadingManager();

      storage.current = { ...storage.current, ...context };
      storage.current.camera = camera.current;
      storage.current.renderer = renderer.current;
      storage.current.scene = scene.current;
      storage.current.manager = manager.current;
      storage.current.store = store.current || {};

      renderer.current.setSize(width, height);
      renderer.current.setPixelRatio(window.devicePixelRatio || 1);

      manager.current.onProgress = (
        item: any,
        loaded: number,
        total: number
      ) => {
        if (callbacks.current.onLoadProgress) {
          callbacks.current.onLoadProgress(
            storage.current,
            item,
            loaded,
            total
          );
        }
      };

      manager.current.onError = (url: string) => {
        if (callbacks.current.onLoadError) {
          callbacks.current.onLoadError(storage.current, url);
        }
      };

      manager.current.onLoad = () => {
        if (callbacks.current.onLoad) {
          callbacks.current.onLoad(storage.current);
        }
      };

      start();

      ref.current.appendChild(renderer.current.domElement);

      window.addEventListener("resize", resize, false);

      return () => {
        stop();
      };
    }
  }, []);

  const renderScene = useCallback(() => {
    if (renderer.current && camera.current && scene.current) {
      camera.current.updateProjectionMatrix();
      renderer.current.render(scene.current, camera.current);
    }
  }, [callbacks]);

  const update = useCallback(
    time => {
      deltaTime.current = (time - lastTime.current) / 1000;

      frameId.current = window.requestAnimationFrame(update);

      if (callbacks.current.onUpdate) {
        callbacks.current.onUpdate(storage.current, deltaTime.current);
      }

      if (!storage.current.manualRender) {
        renderScene();
      }

      lastTime.current = time;
    },
    [renderScene]
  );

  const start = useCallback(() => {
    if (callbacks.current.onStart) {
      callbacks.current.onStart(storage.current);
    }

    if (!frameId.current) {
      frameId.current = requestAnimationFrame(update);
    }
  }, [update]);

  const stop = useCallback(() => {
    if (callbacks.current.onDestroy) {
      callbacks.current.onDestroy(storage.current);
    }

    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }
  }, []);

  const resize = useCallback(() => {
    if (ref.current && camera.current && renderer.current) {
      const width = ref.current.clientWidth;
      const height = ref.current.clientHeight;
      const aspect = width / height;

      if (camera.current.type === "PerspectiveCamera") {
        camera.current.aspect = aspect;
      }

      camera.current.updateProjectionMatrix();
      renderer.current.setSize(width, height);
    }
  }, []);

  return element.current;
};

export default useThree;
