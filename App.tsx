
import React, { useState, useEffect } from 'react';
import { AppStep, Scene } from './types';
import { APP_PASSWORD, DEMO_VIDEO_URL } from './constants';
import { generateStoryboard, generateReferenceImage, generateVideoClip, generateProjectEDL } from './services/geminiService';
import { NeonButton, NeonInput, NeonTextarea, NeonCard } from './components/NeonComponents';
import { Logo } from './components/Logo';
import { LoadingOverlay } from './components/LoadingOverlay';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [password, setPassword] = useState('');
  const [script, setScript] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [globalVisualSettings, setGlobalVisualSettings] = useState(''); // Global Character/Scene Bible
  const [edlContent, setEdlContent] = useState('');
  const [edlLoading, setEdlLoading] = useState(false);
  
  // Auth Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      setStep(AppStep.SCRIPT);
    } else {
      alert("密码错误！提示：nihongboluoup!");
    }
  };

  // Step 1: Script -> Storyboard
  const handleGenerateStoryboard = async () => {
    if (!script.trim()) return;
    setLoading(true);
    setLoadingMessage("正在连接 Gemini 3 大脑进行剧本拆解...");
    try {
      const generatedScenes = await generateStoryboard(script);
      setScenes(generatedScenes);
      setStep(AppStep.STORYBOARD);
    } catch (error) {
      alert("分镜生成失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Storyboard -> Images
  const handleEnterImageCreation = () => {
    setStep(AppStep.IMAGES);
  };

  const handleGenerateImage = async (sceneId: string) => {
    // Optimistic update: Set this specific scene to generating
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageStatus: 'generating' } : s));

    try {
      // Find the current prompt from state
      const sceneToGen = scenes.find(s => s.id === sceneId);
      if (!sceneToGen) return;

      // Concatenate Global Settings + Scene Prompt to ensure consistency
      const fullPrompt = globalVisualSettings 
        ? `(Global Visual Settings / 全局视觉设定: ${globalVisualSettings})。 ${sceneToGen.prompt}`
        : sceneToGen.prompt;

      const base64Image = await generateReferenceImage(fullPrompt);
      
      setScenes(prev => prev.map(s => s.id === sceneId ? { 
        ...s, 
        referenceImage: base64Image, 
        imageStatus: 'completed' 
      } : s));

    } catch (error) {
      console.error(error);
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageStatus: 'failed' } : s));
    }
  };

  const handleImageUpload = (sceneId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setScenes(prev => prev.map(s => s.id === sceneId ? { 
        ...s, 
        referenceImage: base64,
        imageStatus: 'completed' 
      } : s));
    };
    reader.readAsDataURL(file);
  };

  // Step 3: Images -> Video
  const handleEnterVideoCreation = () => {
    // Validate if images are ready (optional, but good UX)
    const missingImages = scenes.filter(s => !s.referenceImage).length;
    if (missingImages > 0) {
      if (!confirm(`还有 ${missingImages} 个场景没有参考图，Gemini 将自由发挥。是否继续？`)) return;
    }
    setStep(AppStep.VIDEO);
  };

  const handleGenerateVideo = async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoStatus: 'generating' } : s));
    
    // We don't use global loading overlay here to allow parallel or background generation visually
    
    try {
      const scene = scenes[sceneIndex];
      const videoUrl = await generateVideoClip(scene.prompt, scene.referenceImage);
      
      setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoUrl, videoStatus: 'completed' } : s));
    } catch (error) {
      console.error(error);
      setScenes(prev => prev.map((s, i) => i === sceneIndex ? { ...s, videoStatus: 'failed' } : s));
      alert("视频生成失败，请检查网络或稍后重试。");
    }
  };

  const handleGenerateEDL = async () => {
    setEdlLoading(true);
    try {
      const result = await generateProjectEDL(scenes);
      setEdlContent(result);
    } catch (error) {
      alert("EDL 生成失败");
    } finally {
      setEdlLoading(false);
    }
  };


  // Render Helpers
  const renderAuth = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Logo size="lg" />
      <form onSubmit={handleLogin} className="mt-12 w-full max-w-md space-y-6">
        <NeonInput 
          type="password" 
          placeholder="请输入通行密钥..." 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <NeonButton type="submit" className="w-full">
          进入系统
        </NeonButton>
      </form>
    </div>
  );

  const renderScriptInput = () => (
    <div className="container mx-auto max-w-4xl p-6">
      <h2 className="text-3xl font-bold mb-6 text-neon-pink">STEP 1: 剧本输入</h2>
      <NeonCard className="mb-8">
        <label className="block text-sm text-neon-cyan mb-2 font-mono">SCENARIO TEXT</label>
        <NeonTextarea 
          rows={10} 
          placeholder="在这里输入你的精彩故事..."
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
      </NeonCard>
      <div className="flex justify-end">
        <NeonButton onClick={handleGenerateStoryboard} disabled={!script}>
          AI 分镜拆解 &rarr;
        </NeonButton>
      </div>
    </div>
  );

  const renderStoryboard = () => (
    <div className="container mx-auto max-w-6xl p-6">
       <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-neon-pink">STEP 2: 分镜确认</h2>
        <NeonButton variant="secondary" onClick={() => setStep(AppStep.SCRIPT)}>返回修改剧本</NeonButton>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {scenes.map((scene, idx) => (
          <NeonCard key={scene.id} className="flex flex-col gap-0 p-0 overflow-visible">
            
            {/* Header */}
            <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-neon-pink flex items-center justify-center text-black font-bold font-mono">
                    {idx + 1}
                 </div>
                 <span className="text-neon-yellow font-bold tracking-wider">SCENE</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/10">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                 <span className="text-xs text-gray-300 font-mono">{scene.duration}s</span>
              </div>
            </div>
            
            <div className="p-5 space-y-6">
                {/* Story Section - Updated to Box Style */}
                <div className="bg-black/40 p-4 border border-white/10 rounded-lg space-y-3 relative group focus-within:border-neon-cyan/50 transition-colors">
                  <label className="flex items-center gap-2 text-sm text-neon-cyan font-bold uppercase tracking-wide">
                    <span>🎬</span> 剧情 / Story
                  </label>
                  <NeonTextarea 
                    value={scene.description}
                    onChange={(e) => {
                      const newScenes = [...scenes];
                      newScenes[idx] = { ...newScenes[idx], description: e.target.value };
                      setScenes(newScenes);
                    }}
                    rows={3}
                    className="text-base text-gray-200 bg-transparent border-0 focus:shadow-none p-0 focus:ring-0 w-full resize-none font-sans"
                    placeholder="Describe what happens..."
                  />
                </div>

                {/* Visual Section - Distinct Box */}
                <div className="bg-black/40 p-4 border border-white/10 rounded-lg space-y-3 relative group focus-within:border-neon-pink/50 transition-colors">
                  <label className="flex items-center gap-2 text-sm text-neon-pink font-bold uppercase tracking-wide">
                    <span>🎨</span> 画面提示词 / Visual Prompt
                  </label>
                  <NeonTextarea 
                    value={scene.prompt}
                    onChange={(e) => {
                      const newScenes = [...scenes];
                      newScenes[idx] = { ...newScenes[idx], prompt: e.target.value };
                      setScenes(newScenes);
                    }}
                    rows={4}
                    className="text-sm font-mono text-gray-300 bg-transparent border-0 focus:shadow-none p-0 focus:ring-0 w-full"
                    placeholder="Enter detailed visual prompt for AI generation..."
                  />
                  <div className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    AI GEN PARAMETER
                  </div>
                </div>

                {/* Camera Section - Distinct Box (Unified Style) */}
                <div className="bg-black/40 p-4 border border-white/10 rounded-lg space-y-3 relative group focus-within:border-neon-yellow/50 transition-colors">
                   <label className="flex items-center gap-2 text-sm text-neon-yellow font-bold uppercase tracking-wide">
                     <span>🎥</span> 镜头参数 / Camera
                   </label>
                   <NeonTextarea 
                      value={scene.camera}
                      onChange={(e) => {
                        const newScenes = [...scenes];
                        newScenes[idx] = { ...newScenes[idx], camera: e.target.value };
                        setScenes(newScenes);
                      }}
                      rows={2}
                      className="text-sm font-mono text-gray-300 bg-transparent border-0 focus:shadow-none p-0 focus:ring-0 w-full resize-none placeholder-white/20"
                      placeholder="推拉摇移... (仅限中文)"
                   />
                </div>
            </div>

          </NeonCard>
        ))}
      </div>

      <div className="flex justify-end gap-4 sticky bottom-6 bg-neon-dark/90 p-4 border-t border-white/10 backdrop-blur-sm z-40">
        <NeonButton onClick={handleEnterImageCreation}>
          确认分镜，制作参考图 &rarr;
        </NeonButton>
      </div>
    </div>
  );

  const renderImageCreation = () => (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-neon-cyan">STEP 3: 参考图制作</h2>
        <NeonButton variant="secondary" onClick={() => setStep(AppStep.STORYBOARD)}>返回分镜</NeonButton>
      </div>

      {/* GLOBAL VISUAL BIBLE SECTION */}
      <NeonCard className="mb-10 border-neon-cyan/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="flex items-center gap-2 text-neon-cyan border-b border-neon-cyan/20 pb-4 mb-4">
            <span className="text-2xl">🌐</span>
            <h3 className="text-xl font-bold tracking-widest uppercase font-mono">GLOBAL VISUAL BIBLE / 全局视觉统一设定</h3>
        </div>
        <p className="text-sm text-gray-400 font-mono mb-4">
            💡 为了保证角色和场景的一致性，请在此定义主角的固定外貌（如：发色、服装）以及整体世界观风格。这段描述将被强制应用到所有分镜的生成中。
        </p>
        
        {/* Boxed Input Area for Global Bible */}
        <div className="bg-black/40 p-4 border border-white/10 rounded-lg space-y-2 relative group focus-within:border-neon-cyan/50 transition-colors">
            <label className="flex items-center justify-between text-sm text-neon-cyan font-bold uppercase tracking-wide">
                <span className="flex items-center gap-2">📝 设定描述 / DESCRIPTION</span>
                <span className="text-white/20 text-[10px]">APPLIED TO ALL SCENES</span>
            </label>
            <NeonTextarea 
                value={globalVisualSettings}
                onChange={(e) => setGlobalVisualSettings(e.target.value)}
                placeholder="例如：主角是一位银色短发的赛博格少女，穿着发光的黄色机能风夹克，佩戴红色护目镜。背景是阴雨绵绵的霓虹东京，紫色和青色的灯光..."
                rows={4}
                className="text-sm font-mono text-neon-yellow bg-transparent border-0 focus:shadow-none p-0 focus:ring-0 w-full resize-none placeholder-white/20"
            />
        </div>
      </NeonCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        {scenes.map((scene, idx) => (
          <NeonCard key={scene.id} className="flex flex-col h-full p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
               <span className="text-neon-yellow font-bold font-mono tracking-wider">SCENE {idx + 1}</span>
               <span className="text-xs text-gray-500 font-mono">16:9</span>
            </div>
            
            {/* Image Preview Area */}
            <div className="aspect-video bg-black/60 border border-white/10 mb-4 flex items-center justify-center overflow-hidden relative group rounded-sm">
              {scene.imageStatus === 'generating' ? (
                <div className="flex flex-col items-center justify-center text-neon-pink animate-pulse">
                   <div className="w-10 h-10 border-2 border-neon-pink border-t-transparent rounded-full animate-spin mb-2"/>
                   <span className="text-xs font-mono">GENERATING...</span>
                </div>
              ) : scene.imageStatus === 'failed' ? (
                 <div className="flex flex-col items-center justify-center text-red-500">
                   <span className="text-2xl mb-1">⚠️</span>
                   <span className="text-xs font-mono">FAILED</span>
                 </div>
              ) : scene.referenceImage ? (
                <img src={scene.referenceImage} alt="ref" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-600">
                    <div className="w-8 h-8 border border-dashed border-gray-600 rounded-full flex items-center justify-center">?</div>
                    <span className="text-xs font-mono uppercase">Waiting for Input</span>
                </div>
              )}
              
              {/* Hover Actions (Upload) */}
              <div className={`absolute inset-0 bg-black/80 opacity-0 ${scene.imageStatus !== 'generating' ? 'group-hover:opacity-100' : ''} transition-opacity flex items-center justify-center backdrop-blur-sm`}>
                 <label className="cursor-pointer flex flex-col items-center gap-2 text-white hover:text-neon-cyan transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    <span className="text-xs font-bold tracking-widest">UPLOAD LOCAL IMAGE</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(scene.id, e.target.files[0])} />
                 </label>
              </div>
            </div>

            {/* Prompt Editing Box - Uniform Style */}
            <div className="flex flex-col flex-grow gap-3">
                <div className="bg-black/40 p-3 border border-white/10 rounded-lg space-y-2 relative group focus-within:border-neon-pink/50 transition-colors flex-grow">
                  <label className="flex items-center justify-between text-[10px] text-neon-pink font-bold uppercase tracking-wide">
                    <span className="flex items-center gap-1">🎨 提示词微调 / PROMPT</span>
                    <span className="text-white/20">EDITABLE</span>
                  </label>
                  <NeonTextarea 
                      value={scene.prompt}
                      onChange={(e) => {
                        const newScenes = [...scenes];
                        newScenes[idx] = { ...newScenes[idx], prompt: e.target.value };
                        setScenes(newScenes);
                      }}
                      rows={4}
                      className="text-xs font-mono text-gray-300 bg-transparent border-0 focus:shadow-none p-0 focus:ring-0 w-full resize-none placeholder-white/20 h-full min-h-[80px]"
                      placeholder="Enter visual prompt..."
                  />
                </div>

                {/* Generate Button */}
                <NeonButton 
                  variant={scene.referenceImage ? "secondary" : "primary"}
                  className={`w-full text-xs py-3 font-mono tracking-widest ${scene.referenceImage ? 'border-dashed' : ''}`}
                  onClick={() => handleGenerateImage(scene.id)}
                  disabled={scene.imageStatus === 'generating'}
                >
                  {scene.imageStatus === 'generating' 
                    ? 'GENERATING...' 
                    : scene.referenceImage 
                      ? 'RE-GENERATE / 重新生成' 
                      : 'GENERATE / 生成图像'}
                </NeonButton>
            </div>
          </NeonCard>
        ))}
      </div>

      <div className="flex justify-end gap-4 sticky bottom-6 bg-neon-dark/90 p-4 border-t border-white/10 backdrop-blur-sm z-40">
        <NeonButton onClick={handleEnterVideoCreation}>
          进入视频合成 &rarr;
        </NeonButton>
      </div>
    </div>
  );

  const renderVideoCreation = () => (
    <div className="container mx-auto max-w-7xl p-6 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-neon-pink">STEP 4: 视频生成 (Veo)</h2>
        <NeonButton variant="secondary" onClick={() => setStep(AppStep.IMAGES)}>返回参考图</NeonButton>
      </div>

      <div className="space-y-12 mb-24">
        {scenes.map((scene, idx) => (
          <NeonCard key={scene.id} className="p-0 overflow-visible">
            {/* 1. Header Bar */}
            <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-neon-yellow text-black flex items-center justify-center font-bold font-mono">
                   {idx + 1}
                 </div>
                 <span className="text-neon-yellow font-bold tracking-widest font-mono">SCENE CONTROLLER</span>
              </div>
               <div className="flex items-center gap-2">
                 <span className="text-xs text-gray-400 font-mono">DURATION:</span>
                 <span className="text-neon-cyan font-bold font-mono">{scene.duration}s</span>
              </div>
            </div>

            {/* 2. Main Content Grid (Side by Side Monitors) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
               {/* Left: Source Monitor (Reference) */}
               <div className="relative border-r border-white/10 bg-black/40 p-4 lg:p-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-neon-cyan tracking-widest uppercase">SOURCE / 参考底图</span>
                    {scene.referenceImage ? (
                       <span className="text-[10px] bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/20">READY</span>
                    ) : (
                       <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">MISSING</span>
                    )}
                  </div>
                  
                  <div className="relative w-full aspect-video bg-black/50 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                      {scene.referenceImage ? (
                        <img src={scene.referenceImage} alt="Reference" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-600 flex flex-col items-center">
                           <span className="text-4xl opacity-20">🖼️</span>
                           <span className="text-xs mt-2 font-mono">NO REFERENCE</span>
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">Prompt: {scene.prompt.substring(0, 50)}...</p>
               </div>

               {/* Right: Program Monitor (Output) */}
               <div className="relative bg-black/60 p-4 lg:p-6 flex flex-col gap-3">
                   <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neon-pink tracking-widest uppercase">VEO RENDER / 最终成片</span>
                      {scene.videoUrl === DEMO_VIDEO_URL && (
                         <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30 animate-pulse font-bold">⚠️ DEMO PREVIEW</span>
                      )}
                    </div>
                    {scene.videoStatus === 'completed' && <span className="text-[10px] bg-neon-pink/10 text-neon-pink px-2 py-0.5 rounded border border-neon-pink/20">DONE</span>}
                  </div>

                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                      {scene.videoStatus === 'idle' && (
                        <div className="text-gray-600 flex flex-col items-center">
                          <span className="text-4xl opacity-20">🎬</span>
                          <span className="text-xs mt-2 font-mono">WAITING TO RENDER</span>
                        </div>
                      )}
                      {scene.videoStatus === 'generating' && (
                        <div className="flex flex-col items-center justify-center">
                           <div className="w-16 h-16 border-4 border-neon-pink border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_#ff00ff]"></div>
                           <p className="text-neon-pink animate-pulse font-mono tracking-widest">RENDERING...</p>
                        </div>
                      )}
                      {scene.videoStatus === 'failed' && (
                         <div className="text-red-500 flex flex-col items-center">
                            <span className="text-4xl">⚠️</span>
                            <span className="text-sm mt-2 font-mono">RENDER FAILED</span>
                         </div>
                      )}
                      {scene.videoStatus === 'completed' && scene.videoUrl && (
                        <video controls className="w-full h-full object-contain" src={scene.videoUrl}></video>
                      )}
                  </div>
                  
                  {/* Download Action */}
                  <div className="flex justify-end h-4">
                     {scene.videoStatus === 'completed' && scene.videoUrl && (
                        <a href={scene.videoUrl} download={`scene_${idx+1}.mp4`} target="_blank" rel="noreferrer" className="text-xs text-neon-pink hover:text-white transition-colors flex items-center gap-1">
                          DOWNLOAD MP4 <span className="text-lg">⬇</span>
                        </a>
                     )}
                  </div>
               </div>
            </div>

            {/* 3. Footer Control Bar */}
            <div className="bg-neon-card/80 backdrop-blur-sm p-4 border-t border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 text-sm text-gray-300 font-mono border-l-2 border-neon-yellow pl-3">
                  <span className="block text-[10px] text-gray-500 uppercase mb-1">STORY DESCRIPTION</span>
                  {scene.description}
                </div>
                
                <div className="w-full md:w-auto flex-shrink-0">
                   <NeonButton 
                      className="w-full md:w-48"
                      onClick={() => handleGenerateVideo(scene.id)}
                      isLoading={scene.videoStatus === 'generating'}
                      disabled={scene.videoStatus === 'generating'}
                   >
                      {scene.videoStatus === 'completed' ? 'RE-RENDER' : 'RENDER CLIP'}
                   </NeonButton>
                </div>
            </div>

          </NeonCard>
        ))}
      </div>

      {/* --- EDL Generation Section --- */}
      <NeonCard className="mt-12 bg-black/80 border-t-4 border-neon-cyan">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <span className="text-3xl">📋</span>
             <div>
               <h3 className="text-xl font-bold text-neon-cyan tracking-widest font-mono">POST-PRODUCTION DATA / 剪辑决策表</h3>
               <p className="text-xs text-gray-400 font-mono">GENERATE CMX 3600 EDL FOR NLE IMPORT</p>
             </div>
          </div>
          <NeonButton 
            onClick={handleGenerateEDL} 
            isLoading={edlLoading}
            variant="secondary"
          >
            {edlContent ? 'RE-GENERATE EDL' : 'GENERATE EDL TABLE / 生成剪辑表'}
          </NeonButton>
        </div>

        {edlContent && (
          <div className="relative group">
             <div className="bg-black border border-white/20 p-6 rounded font-mono text-sm text-neon-yellow overflow-x-auto whitespace-pre shadow-inner min-h-[200px]">
                {edlContent}
             </div>
             <button 
               onClick={() => navigator.clipboard.writeText(edlContent)}
               className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded transition-colors"
             >
               COPY TO CLIPBOARD
             </button>
          </div>
        )}
      </NeonCard>

    </div>
  );

  return (
    <div className="min-h-screen bg-neon-dark text-white selection:bg-neon-pink selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-pink/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-cyan/5 rounded-full blur-[120px]" />
      </div>

      {loading && <LoadingOverlay message={loadingMessage} />}

      <div className="relative z-10">
        {step !== AppStep.AUTH && (
          <header className="p-4 flex items-center gap-4 border-b border-white/10 bg-neon-dark/50 backdrop-blur-md sticky top-0 z-50">
            <div className="w-8 h-8"><Logo size="sm" /></div>
            <h1 className="text-lg font-bold tracking-wider">NEO PINEAPPLE</h1>
          </header>
        )}

        <main>
          {step === AppStep.AUTH && renderAuth()}
          {step === AppStep.SCRIPT && renderScriptInput()}
          {step === AppStep.STORYBOARD && renderStoryboard()}
          {step === AppStep.IMAGES && renderImageCreation()}
          {step === AppStep.VIDEO && renderVideoCreation()}
        </main>
      </div>
    </div>
  );
};

export default App;