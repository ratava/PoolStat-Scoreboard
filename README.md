<div align="center">
    <table width="100%" border="0">
        <tr>
            <td>
                <div align="center">
                    <p style="color:yellow; font-weight:bolder"><b>PoolStat ScoreBoard</b>
                </div>
            </td>
            <td>
                <div align="center"><span style="font-size: 12px"><i>(Must be viewed @ 1920x1080)</i></span></div>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <div align="center"><br><b>Made for Australian users of PoolStat, based off of <a href="https://github.com/iainsmacleod/CueSport-Scoreboard)/">CueSport Scoreboard</a><br><span style="color: yellow"> and <a href="https://github.com/ngholson/g4ScoreBoard/">g4scoreboard</a><br><span style="color: yellow"> 
				</div>
            </td>
        </tr>
        <tr>
            <td>
                </div>
            </td>
            <td>
                <div align="right"><br>View the full Wiki <a href="https://github.com/ratava/PoolStat-Scoreboard/wiki">Here</a>
                    <br><a href="https://github.com/ratava/PoolStat-Scoreboard#installation" target="_blank">Plugin Installation Instructions</a><br>See <a href="https://github.com/iainsmacleod/CueSport-Scoreboard/releases" target="_blank">Releases Page</a> for most recent official release
                </div>
            </td>
        </tr>
    </table>
</div>
<br>
<a href="https://www.buymeacoffee.com/brentwesley" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
```

PoolStat ScoreBoard is a modified version of CueSport Scoreboard which was orgianlly based of G4ScoreBoard. The purpose of this modification is to integrate Live scoring from PoolStat.net.au.

PoolStat Scoreboatd addon for OBS Copyright 2025 Brent Wesley
CueSport ScoreBoard addon for OBS Copyright 2025 Iain MacLeod

Modified version of G$Scoreboard:-
G4ScoreBoard addon for OBS Copyright 2022-2023 Norman Gholson IV
https://g4billiards.com http://www.g4creations.com
```
-------------------------------------------------------------

## Extract zip file to the folder of your choice.<br>

```
Zip contents:
{Cuesport-Scoreboard-main.zip}
|
|-[common]
|   |-[js]
|   |   |-jquery.js
|   |   |-browser_source.js
|   |   |-control_panel.js
|   |   |-browser_source_post.js
|   |   |-control_panel_post.js
|   |
|   |-[css]
|   |	|-[control_panel]
|   |	|   |-yami.css
|   | 	|   |-acri.css
|   |	|   |-dark.css
|   |	|   |-grey.css
|   |	|   |-rachni.css
|   |	|   |-light.css
|   |   |   |-required.css
|   |	|
|   |	|-[browser_source]
|   |	    |-125.css
|   |	    |-150.css
|   |       |-200.css
|   |
|   |-[images]
|   |   |-8ball_original.png
|   |   |-8ball_small.png
|   |   |-8_ball_game.png <-example of other custom logo use
|   |   |-9_ball_game.png <-example of other custom logo use
|   |   |-template.psd
|	|	|-placeholder.png
|   |
|   |-[sound]
|       |-beep2.mp3
|       |-buzz.mp3
|
|-shot_clock_display.html   
|-g4ScoreBoard_hotkeys.lua
|-browser_source.html   
|-control_panel.html
|-hotkeys.js
|-README.md
|-LICENSE
 
```
--------------------------------------------------------------

## Installation:
```
Extract the downloaded file to the directory of your choosing, 
just make sure you know where to find it again. 

OBS V27.2 and higher Configuration (required):
	
1. click on the Docks Menu from the top menu bar.
2. Select "Custom Browser Docks".
3. type a name (Cuesport-Scoreboard) in the "Dock Name" box.
4. input the full path file URI to "control_panel.html" in the URL box. 
   (example: "file:///c:/users/yourname/desktop/PoolStat-Scoreboard/control_panel.html")
5. Click "Close"
6. Select the scene you want the scoreboard to display.
7. Add a "Browser Source" -> "Create New" -> give it a name. click OK.
8. Input the full path file URI to "browser_source.html" in the URL box.
   (example: "file:///c:/users/yourname/desktop/PoolStat-Scoreboard/browser_source.html")
9. Set Width to 1920 and Height to 1080. 
10. click OK.

	

---------------------------------------------------------------




