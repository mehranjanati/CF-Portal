# TASK 21_02: Approval Gates & Human-in-the-Loop

## هدف
پیاده‌سازی سیستم تأیید actions با ریسک بالا.

## Files
- `cloudflare/platform-api/src/agents/approval/ApprovalGate.ts` (CREATE)
- `cloudflare/portal/src/lib/components/ApprovalGate.svelte` (CREATE)

## پیاده‌سازی

```typescript
// Approval gate system
export class ApprovalGate {
  async requestApproval(action: ToolAction, risk: RiskLevel): Promise<Approval> {}
  async checkStatus(approvalId: string): Promise<ApprovalStatus> {}
  async timeout(approvalId: string): Promise<void> {}
}
```

## معیارهای موفقیت
- [ ] High-risk actions require approval
- [ ] Approvers notified
- [ ] Timeout handling works