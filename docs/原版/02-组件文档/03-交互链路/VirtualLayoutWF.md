# VirtualLayoutWF · 交互链路

> 来源：`VirtualLayoutWF.js`，共 10 个方法

## `refreshCollection`

- **内部调用**：`onCollectionChanged`

## `onCollectionChanged`

- **内部调用**：`updateGridDimensions`、`flushDisplayItems`

## `onGroupChanged`

- **内部调用**：`updateGridDimensions`、`flushDisplayItems`

## `onScroll`

- **内部调用**：`flushDisplayItems`

## `loadMore`

- **emit**：`scroll`、`loadMore`
- **内部调用**：`$nextTick`

## `flushDisplayItems`

- **内部调用**：`loadMore`
