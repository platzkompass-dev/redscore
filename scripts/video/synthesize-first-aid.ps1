param([string]$Language='de')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$spec=Get-Content (Join-Path $PSScriptRoot 'first-aid-scenes.json') -Raw | ConvertFrom-Json
$out=Join-Path $root "tmp/first-aid-video/$Language"
New-Item -ItemType Directory -Force $out | Out-Null
$synth=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $synth.SelectVoice($(if($Language -eq 'en'){'Microsoft Zira Desktop'}else{'Microsoft Stefan'}))
 $synth.Rate=0
 foreach($scene in $spec.scenes){
  $synth.SetOutputToWaveFile((Join-Path $out ($scene.id+'.wav')))
  $synth.Speak($scene.$Language.voice)
  $synth.SetOutputToNull()
  Write-Output "Narrated $Language/$($scene.id)"
 }
}finally{$synth.Dispose()}
