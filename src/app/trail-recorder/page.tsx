'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrailRecordCard } from '@/components/trail-recorder/TrailRecordCard';
import { TrailRecordForm } from '@/components/trail-recorder/TrailRecordForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TrailRecordListItem } from '@/lib/types/trail-recorder';

interface ListResponse {
  success: boolean;
  data?: {
    items: TrailRecordListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

export default function TrailRecorderPage() {
  const [records, setRecords] = useState<TrailRecordListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchRecords = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trail-recorder?page=${pageNum}&limit=20`
      );
      const data: ListResponse = await response.json();

      if (data.success && data.data) {
        setRecords(data.data.items);
        setTotalPages(data.data.totalPages);
        setPage(data.data.page);
      } else {
        setError(data.error || 'Failed to load trail records');
      }
    } catch (err) {
      setError('Failed to load trail records');
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [fetchRecords]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trail Recorder</h1>
          <p className="text-muted-foreground mt-1">
            Document and share your trail experiences
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Trail
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchRecords(page)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && records.length === 0 && (
        <div className="text-center py-12">
          <Mountain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No trail records yet</h2>
          <p className="text-muted-foreground mb-4">
            Start documenting your trail adventures!
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Your First Trail
          </Button>
        </div>
      )}

      {/* Records list */}
      {!isLoading && records.length > 0 && (
        <div className="space-y-4">
          {records.map((record) => (
            <TrailRecordCard key={record.id} record={record} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchRecords(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchRecords(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Trail</DialogTitle>
          </DialogHeader>
          <TrailRecordForm mode="create" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
