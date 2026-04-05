'use client';

import { Card, Flex, Text, Heading } from '@radix-ui/themes';
import type { MemoryRow } from '@/lib/supabase';

export default function StatsBar({ memories }: { memories: MemoryRow[] }) {
  const totalMemories = memories.length;
  const uniqueAgents = new Set(memories.map(m => m.agent_id)).size;
  const latestWrite = memories.length > 0
    ? new Date(memories[0].created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const typeCounts = memories.reduce((acc, m) => {
    const t = m.memory_type || 'observation';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Flex gap="3" mb="4" wrap="wrap">
      <StatCard label="Total Memories" value={totalMemories.toString()} />
      <StatCard label="Agents" value={uniqueAgents.toString()} />
      <StatCard label="Latest Write" value={latestWrite} />
      <StatCard label="Facts" value={(typeCounts.fact || 0).toString()} color="blue" />
      <StatCard label="Decisions" value={(typeCounts.decision || 0).toString()} color="amber" />
      <StatCard label="Preferences" value={(typeCounts.preference || 0).toString()} color="purple" />
      <StatCard label="Observations" value={(typeCounts.observation || 0).toString()} color="lime" />
    </Flex>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card size="1" variant="surface" style={{ flex: 1, minWidth: 120 }}>
      <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </Text>
      <Heading size="5" weight="bold" style={{ color: color ? `var(--${color}-9)` : undefined }}>
        {value}
      </Heading>
    </Card>
  );
}
