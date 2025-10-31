#!/usr/bin/env node
/*
  Replace LaunchScreen.storyboard with a minimal solid black screen.
  Run after `npx cap sync ios`.
*/
const fs = require('fs')
const path = require('path')

const file = path.join('ios','App','App','LaunchScreen.storyboard')
if (!fs.existsSync(file)) {
  console.log('[launchscreen] LaunchScreen.storyboard not found, skipping.')
  process.exit(0)
}

const content = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="17701" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" colorMatched="YES">
    <device id="retina6_1" orientation="portrait" appearance="light"/>
    <scenes>
        <scene sceneID="splash-scene">
            <objects>
                <viewController id="VC" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="ROOT">
                        <rect key="frame" x="0.0" y="0.0" width="414" height="896"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
                        <viewLayoutGuide key="safeArea" id="SAFE"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="FR" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="53" y="375"/>
        </scene>
    </scenes>
</document>`

try {
  fs.writeFileSync(file, content, 'utf8')
  console.log('[launchscreen] LaunchScreen.storyboard overwritten with solid black screen.')
} catch (e) {
  console.error('[launchscreen] Failed to write LaunchScreen.storyboard', e)
  process.exit(1)
}
