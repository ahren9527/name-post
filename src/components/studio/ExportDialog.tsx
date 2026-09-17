import { Clapperboard, Download, Film, Image as ImageIcon, Layers } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  canExportWebm,
  exportCurrentPng,
  exportMovAlpha,
  exportPngSequence,
  exportWebmAlpha,
  pickMovKind,
  type MovKind,
} from "@/lib/nameplates/export";
import { renderConfigFromState, soloConfig } from "@/lib/nameplates/renderer";
import { useStudio } from "@/lib/nameplates/store";
import { personSlotDuration, type ExportFps, isNtscFps } from "@/lib/nameplates/types";
import { cn } from "@/lib/utils";

type Format = "mov" | "webm" | "pngseq" | "frame";

function parseFps(raw: string): ExportFps {
  const n = Number(raw);
  if (n === 25) return 25;
  if (n === 30) return 30;
  return 29.97;
}

function movCaption(kind: MovKind): string {
  if (kind === "prores") return "ProRes 4444 · Alpha";
  if (kind === "hevc") return "HEVC · 透明通道";
  return "PNG 编码 · 透明通道";
}

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const exportWidth = useStudio((s) => s.exportWidth);
  const exportFps = useStudio((s) => s.exportFps);
  const people = useStudio((s) => s.people);
  const [format, setFormat] = useState<Format>("mov");
  const [who, setWho] = useState<string>("all");
  const [webmOk, setWebmOk] = useState(true);
  const [movKind, setMovKind] = useState<MovKind>("png");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const named = people.filter((p) => p.name.trim().length > 0);

  useEffect(() => {
    if (!open) return;
    void canExportWebm().then(setWebmOk);
    void pickMovKind().then(setMovKind);
    const st = useStudio.getState();
    const cfg = renderConfigFromState(st);
    const list = cfg.people.filter((p) => p.name.trim());
    if (cfg.layout === "sequence" && list.length > 1) {
      const slot = personSlotDuration(cfg);
      const i = Math.max(0, Math.min(list.length - 1, Math.floor(st.currentTime / slot)));
      setWho(list[i]!.id);
    } else {
      setWho("all");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function run() {
    const st = useStudio.getState();
    const full = renderConfigFromState(st);
    const picked = named.find((p) => p.id === who);
    const config = who !== "all" && picked ? soloConfig(full, picked) : full;
    if (config.people.every((p) => !p.name.trim())) {
      toast.error("请先填写至少一位嘉宾姓名");
      return;
    }
    const width = st.exportWidth;
    const height = width === 1920 ? 1080 : 720;
    const soloName = config.people.length === 1 ? config.people[0]!.name.trim() : "";
    setBusy(true);
    setProgress(0);
    setStatus("准备编码…");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      if (format === "mov") {
        await exportMovAlpha({
          config,
          width,
          height,
          fps: st.exportFps,
          onProgress: (r, label) => {
            setProgress(r);
            setStatus(label);
          },
        });
        toast.success(soloName ? `已下载：${soloName} 透明 MOV` : "已下载：每人一条透明 MOV");
      } else if (format === "webm") {
        const blob = await exportWebmAlpha({
          config,
          width,
          height,
          fps: st.exportFps,
          onProgress: (r, label) => {
            setProgress(r);
            setStatus(label);
          },
        });
        if (blob.type === "video/webm") {
          setPreviewUrl(URL.createObjectURL(blob));
        }
        toast.success(soloName ? `已下载：${soloName} 透明 WebM` : "已下载：每人一条透明 WebM");
      } else if (format === "pngseq") {
        await exportPngSequence({
          config,
          width,
          height,
          fps: st.exportFps,
          onProgress: (r, label) => {
            setProgress(r);
            setStatus(label);
          },
        });
        toast.success(soloName ? `已下载：${soloName} PNG 序列` : "已下载：每人一条 PNG 序列");
      } else {
        await exportCurrentPng({
          config,
          time: soloName ? personSlotDuration(config) * 0.45 : st.currentTime,
          width,
          height,
          filename: soloName ? `${soloName}_当前帧.png` : undefined,
        });
        toast.success(soloName ? `已下载：${soloName} 当前帧` : "已下载当前帧透明 PNG");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "导出失败";
      toast.error(message);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导出设置</DialogTitle>
          <DialogDescription>MOV / WebM 透明通道，可按人单独导出。默认 29.97 fps。</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <FormatCard
            active={format === "mov"}
            icon={<Clapperboard />}
            title="MOV 透明"
            caption={movCaption(movKind)}
            onClick={() => setFormat("mov")}
          />
          <FormatCard
            active={format === "webm"}
            disabled={!webmOk}
            icon={<Film />}
            title="WebM 透明"
            caption={webmOk ? "VP9 · 网页预览" : "浏览器不支持"}
            onClick={() => webmOk && setFormat("webm")}
          />
          <FormatCard
            active={format === "pngseq"}
            icon={<Layers />}
            title="PNG 序列"
            caption="每人一个文件夹"
            onClick={() => setFormat("pngseq")}
          />
          <FormatCard
            active={format === "frame"}
            icon={<ImageIcon />}
            title="当前帧"
            caption="单张透明 PNG"
            onClick={() => setFormat("frame")}
          />
        </div>

        {named.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <Label>导出对象</Label>
            <select
              className="h-10 rounded-md border border-input bg-secondary px-3 text-sm"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              <option value="all">全部嘉宾（每人一条）</option>
              {named.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {format !== "frame" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>分辨率</Label>
              <select
                className="h-10 rounded-md border border-input bg-secondary px-3 text-sm"
                value={exportWidth}
                onChange={(e) =>
                  useStudio.getState().setExportWidth(Number(e.target.value) as 1280 | 1920)
                }
              >
                <option value={1920}>1920 × 1080</option>
                <option value={1280}>1280 × 720</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>帧率</Label>
              <select
                className="h-10 rounded-md border border-input bg-secondary px-3 text-sm"
                value={isNtscFps(exportFps) ? "29.97" : String(exportFps)}
                onChange={(e) =>
                  useStudio.getState().setExportFps(parseFps(e.target.value))
                }
              >
                <option value="29.97">29.97 fps</option>
                <option value="25">25 fps</option>
                <option value="30">30 fps</option>
              </select>
            </div>
          </div>
        ) : null}

        {busy ? (
          <div className="flex flex-col gap-2">
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{status}</p>
          </div>
        ) : null}

        {previewUrl ? (
          <div className="overflow-hidden rounded-lg bg-checker">
            <video
              src={previewUrl}
              className="aspect-video w-full"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        ) : null}

        <Button disabled={busy} onClick={() => void run()} className="w-full">
          <Download />
          {busy
            ? "导出中…"
            : who !== "all" && named.find((p) => p.id === who)
              ? `开始导出 · ${named.find((p) => p.id === who)!.name}`
              : "开始导出"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function FormatCard({
  active,
  disabled,
  icon,
  title,
  caption,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-[border-color,background-color] duration-150",
        active ? "border-primary/40 bg-secondary" : "border-border hover:bg-accent",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-[11px] text-muted-foreground">{caption}</span>
    </button>
  );
}
