export interface Region {
  code: string;
  name: string;
}

export interface UF {
  code: string;
  name: string;
  region: Region;
}

export interface ListOptions {
  region?: string;
  sortBy?: "code" | "name";
}
