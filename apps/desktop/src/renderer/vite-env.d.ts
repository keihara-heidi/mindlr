/// <reference types="vite/client" />

declare module '*?worker' {
  const WorkerCtor: new () => Worker;
  export default WorkerCtor;
}

declare module '*?worker&inline' {
  const WorkerCtor: new () => Worker;
  export default WorkerCtor;
}
