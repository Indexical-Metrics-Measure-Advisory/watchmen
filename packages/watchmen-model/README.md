# Watchmen Model

# Change v16.0.0

- Change `WatchmenModel` to `Tuple`,
    - Change `createTime: str` to `createdAt: datetime`,
    - Add `createdBy: str`,
    - Change `lastModified` to `lastModifiedAt`,
    - Add `lastModifiedBy: str`,
- Change `ConsoleSpace` to `ConnectedSpace`
- Change `lastVisitTime: str` to `lastVisitTime: datetime` on,
    - Connected Space
    - Subject
    - Report
    - Dashboard