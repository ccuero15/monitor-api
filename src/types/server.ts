export interface SSEProcess {
  pid: number;
  name: string;
  cpuUsage: number;
  ramUsage: number;
}

export interface SSEMessage {
  serverId: string;
  hostname: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  processes?: SSEProcess[];
}

export interface ChartMetric {
  time: string;
  cpu: number;
  ram: number;
  disk: number;
}

export interface Process {
  id: string;
  name: string;
  cpuUsage: number;
  ramUsage: number;
  pid: number;
}