import { Handle, useNodeConnections } from "@xyflow/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type FlowHandleProps = Omit<ComponentProps<typeof Handle>, "children">;

export function FlowHandle({ type, id, className, ...props }: FlowHandleProps) {
  const connections = useNodeConnections({
    handleType: type,
    handleId: id ?? undefined,
  });

  const isConnected = connections.length > 0;

  return (
    <Handle
      id={id}
      type={type}
      className={cn("wa-flow-handle", type, isConnected && "is-connected", className)}
      {...props}
    />
  );
}
