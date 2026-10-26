const KEY='biobuzz-java-drafts-v1';
const PATH='TeamCode/src/main/java/org/firstinspires/ftc/teamcode/PhoneDraft.java';
const EXAMPLE=`package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

// Save or download this draft, then compile it in the desktop simulator.
@TeleOp(name = "Phone Draft")
public class PhoneDraft extends OpMode {
    private DcMotor left, right;

    @Override public void init() {
        left = hardwareMap.get(DcMotor.class, "frontLeft");
        right = hardwareMap.get(DcMotor.class, "frontRight");
        right.setDirection(DcMotor.Direction.REVERSE);
    }

    @Override public void loop() {
        double drive = -gamepad1.left_stick_y;
        double turn = gamepad1.right_stick_x;
        left.setPower(drive + turn);
        right.setPower(drive - turn);
    }
}
`;
export function createBrowserProject(presets){
 let files={[PATH]:EXAMPLE};
 try{const stored=JSON.parse(localStorage.getItem(KEY));if(stored&&typeof stored==='object'&&!Array.isArray(stored)){const valid=Object.entries(stored).filter(([key,value])=>key.endsWith('.java')&&typeof value==='string');if(valid.length)files=Object.fromEntries(valid);}}catch{}
 return async(path,options={})=>{
  const url=new URL(path,location.origin),json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
  if(url.pathname==='/api/robots')return json(presets);
  if(url.pathname==='/api/config')return json({engine:'Rapier browser practice',javaExecution:false});
  if(url.pathname==='/api/sources')return json({files:Object.keys(files)});
  if(url.pathname==='/api/source'){
   const name=url.searchParams.get('path');
   if(options.method==='POST'){const next={...files,[name]:String(options.body)};localStorage.setItem(KEY,JSON.stringify(next));files=next;return json({saved:true});}
   if(Object.hasOwn(files,name))return new Response(files[name]);
  }
  throw new Error('This feature requires the desktop edition.');
 };
}
