import { useRef, useState } from 'react'
import { Film, Loader2, UploadCloud, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { uploadVideoDirect } from '@/services/video-upload'
import type { BlogVideoAttributes } from './BlogVideo'

const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v'
const MAX_VIDEO_BYTES = 20 * 1024 * 1024 * 1024

interface VideoMetadata {
  width: number
  height: number
  duration: number
}

interface VideoUploadControlProps {
  onUploaded: (video: BlogVideoAttributes) => void
}

export function VideoUploadControl({ onUploaded }: VideoUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const selectFile = async (selectedFile: File) => {
    resetUploadState()
    if (selectedFile.size > MAX_VIDEO_BYTES) {
      setError('视频不能超过 20 GiB。')
      setOpen(true)
      return
    }
    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^.]+$/, ''))
    setOpen(true)
    setMetadata(await readVideoMetadata(selectedFile).catch(() => null))
  }

  const upload = async () => {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setUploading(true)
    setError('')
    try {
      const uploaded = await uploadVideoDirect(
        file,
        (nextProgress) => setProgress(nextProgress.percent),
        controller.signal,
      )
      onUploaded({
        src: uploaded.url,
        title: sanitizeVideoTitle(title.trim() || uploaded.title),
        width: metadata?.width,
        height: metadata?.height,
      })
      setOpen(false)
      resetUploadState()
    } catch (uploadError) {
      if ((uploadError as Error).name !== 'AbortError') {
        setError((uploadError as Error).message || '视频上传失败')
      }
    } finally {
      abortRef.current = null
      setUploading(false)
    }
  }

  const cancelUpload = () => {
    abortRef.current?.abort()
    setOpen(false)
    resetUploadState()
  }

  const resetUploadState = () => {
    setFile(null)
    setMetadata(null)
    setProgress(0)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="上传原画视频"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <Film />
          </Button>
        </TooltipTrigger>
        <TooltipContent>上传原画视频</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0]
          if (selectedFile) void selectFile(selectedFile)
        }}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (uploading) return
          setOpen(nextOpen)
          if (!nextOpen) resetUploadState()
        }}
      >
        <DialogContent
          onInteractOutside={(event) => uploading && event.preventDefault()}
          onEscapeKeyDown={(event) => uploading && event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>上传原画视频</DialogTitle>
            <DialogDescription>
              文件会分片直传 Cloudflare R2，不经过博客服务器，也不会被压缩或转码。
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <X />
              <AlertTitle>上传未完成</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {file && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="truncate font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {metadata && ` · ${metadata.width}×${metadata.height} · ${formatDuration(metadata.duration)}`}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-title">视频标题</Label>
                <Input id="video-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={uploading} />
              </div>
              {uploading && (
                <div className="space-y-2" aria-live="polite">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>正在上传原片</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelUpload}>
              {uploading ? '取消上传' : '取消'}
            </Button>
            <Button disabled={!file || uploading} onClick={() => void upload()}>
              {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              {uploading ? '上传中' : '开始上传'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      }
      cleanup()
      resolve(metadata)
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('无法读取视频信息'))
    }
    video.src = objectUrl
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '时长未知'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function sanitizeVideoTitle(title: string): string {
  return title.replace(/[\r\n]+/g, ' ').replace(/"/g, '”').trim()
}
