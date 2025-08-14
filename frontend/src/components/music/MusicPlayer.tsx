import {Card, CardBody, Button, Image, Slider} from "@heroui/react";
import type {CardProps} from "@heroui/react";
import {useState} from "react";
import type {FC} from "react";
import {clsx} from "@heroui/shared-utils";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Heart,
} from "lucide-react";

export interface MusicPlayerProps extends CardProps {}

export const MusicPlayer: FC<MusicPlayerProps> = ({className, ...otherProps}) => {
  const [liked, setLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(33);

  const handleProgressChange = (value: number | number[]) => {
    const newProgress = Array.isArray(value) ? value[0] : value;
    setProgress(newProgress);
  };

  // 计算当前时间和总时间
  const totalDuration = 4 * 60 + 32; // 4:32 in seconds
  const currentTime = Math.floor((progress / 100) * totalDuration);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      isBlurred
      className={clsx(
        // 玻璃风格基础
        "relative overflow-hidden  dark:border-white/10",
        // 半透明背景
        "bg-white/10 dark:bg-white/5",
        // 模糊效果
        "backdrop-blur-xl",
        // 光泽效果
        // "after:absolute after:inset-0 after:-z-10",
        // "after:bg-gradient-to-tr after:from-white/20 after:via-transparent after:to-transparent",
        "dark:after:from-white/5",
        // 增强阴影效果
        "shadow-2xl shadow-black/10 dark:shadow-black/30",
        className
      )}
      shadow="lg"
      {...otherProps}
    >
      <CardBody>
        <div className="grid grid-cols-6  gap-6 md:gap-4 items-center justify-center">
          <div className="relative col-span-6 md:col-span-8">
            <Image
              alt="Album cover"
              className="object-cover shadow-black/20 rounded-xl"
              height={200}
              shadow="lg"
              src="https://heroui.com/images/album-cover.png"
              width="100%"
            />
          </div>

          <div className="flex flex-col col-span-6 md:col-span-8">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-0">
                <h3 className="font-semibold text-white/90">Daily Mix</h3>
                <p className="text-sm text-white/60">12 Tracks</p>
                <h1 className="text-lg font-medium mt-2 text-white/95">Frontend Radio</h1>
              </div>
              <Button
                isIconOnly
                className="text-white/70 data-[hover]:bg-white/10 -translate-y-2 translate-x-2"
                radius="full"
                variant="light"
                onPress={() => setLiked((v) => !v)}
              >
                <Heart
                  className={`w-5 h-5 ${liked ? 'text-red-400 fill-red-400' : 'text-white/70'}`}
                />
              </Button>
            </div>

            <div className="flex flex-col mt-3 gap-1">
              <Slider
                aria-label="Music progress"
                classNames={{
                  track: "bg-white/15 h-1 rounded-full !border-x-0",
                  filler: "bg-white/80 rounded-full",
                  thumb: "w-3 h-3 bg-white/90 border-1 border-white/50 shadow-sm",
                  base: "max-w-full px-0",
                  trackWrapper: "px-0 !border-x-0",
                }}
                size="sm"
                step={1}
                maxValue={100}
                minValue={0}
                value={progress}
                onChange={handleProgressChange}
                hideThumb={false}
                radius="full"
              />
              <div className="flex justify-between">
                <p className="text-sm text-white/90">{formatTime(currentTime)}</p>
                <p className="text-sm text-white/60">{formatTime(totalDuration)}</p>
              </div>
            </div>

            <div className="flex w-full items-center justify-center mt-4">
              <Button
                isIconOnly
                className="data-[hover]:bg-white/20 text-white/70 hover:text-white/90"
                radius="full"
                variant="light"
                size="sm"
              >
                <Repeat className="w-5 h-5" />
              </Button>
              <Button
                isIconOnly
                className=" data-[hover]:bg-white/20 ml-2 text-white/70 hover:text-white/90"
                radius="full"
                variant="light"
                size="sm"
              >
                <SkipBack className="w-5 h-5 fill-white" />
              </Button>
              <Button
                isIconOnly
                className=" fill-white data-[hover]:bg-white/80 mx-3 text-black bg-white/90   "
                radius="full"
                variant="light"
                size="lg"
                onPress={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" style={{color: '#323232', fill: '#323232'}} />
                ) : (
                  <Play className="w-8 h-8 ml-0.5" style={{color: '#323232', fill: '#323232'}} />
                )}
              </Button>
              <Button
                isIconOnly
                className="data-[hover]:bg-white/20 mr-2 text-white/70 hover:text-white/90"
                radius="full"
                variant="light"
                size="sm"
              >
                <SkipForward className="fill-white w-5 h-5" />
              </Button>
              <Button
                isIconOnly
                className="data-[hover]:bg-white/20 text-white/70 hover:text-white/90"
                radius="full"
                variant="light"
                size="sm"
              >
                <Shuffle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
