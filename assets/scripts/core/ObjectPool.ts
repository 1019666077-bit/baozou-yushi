import { instantiate, Node, Prefab } from "cc";

export class NodePool {
  private readonly free: Node[] = [];

  constructor(
    private readonly prefab: Prefab,
    private readonly maxRetained = 32,
  ) {}

  acquire(): Node {
    const node = this.free.pop() ?? instantiate(this.prefab);
    node.active = true;
    return node;
  }

  release(node: Node): void {
    node.removeFromParent();
    node.active = false;
    if (this.free.length < this.maxRetained) {
      this.free.push(node);
    } else {
      node.destroy();
    }
  }

  clear(): void {
    for (const node of this.free) node.destroy();
    this.free.length = 0;
  }
}
