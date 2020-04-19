	
	
	var UDOC = {};
	
	UDOC.G = {
		concat : function(p,r) {
			for(var i=0; i<r.cmds.length; i++) p.cmds.push(r.cmds[i]);
			for(var i=0; i<r.crds.length; i++) p.crds.push(r.crds[i]);
		},
		getBB  : function(ps) {
			var x0=1e99, y0=1e99, x1=-x0, y1=-y0;
			for(var i=0; i<ps.length; i+=2) {  var x=ps[i],y=ps[i+1];  if(x<x0)x0=x;  if(x>x1)x1=x;  if(y<y0)y0=y;  if(y>y1)y1=y;  }
			return [x0,y0,x1,y1];
		},
		rectToPath: function(r) {  return  {cmds:["M","L","L","L","Z"],crds:[r[0],r[1],r[2],r[1], r[2],r[3],r[0],r[3]]};  },
		// a inside b
		insideBox: function(a,b) {  return b[0]<=a[0] && b[1]<=a[1] && a[2]<=b[2] && a[3]<=b[3];   },
		isBox : function(p, bb) {
			var sameCrd8 = function(pcrd, crds) {
				for(var o=0; o<8; o+=2) {  var eq = true;  for(var j=0; j<8; j++) if(Math.abs(crds[j]-pcrd[(j+o)&7])>=2) {  eq = false;  break;  }    if(eq) return true;  }
				return false;
			};
			if(p.cmds.length>10) return false;
			var cmds=p.cmds.join(""), cr=p.crds;
			var sameRect = false;
			if((cmds=="MLLLZ"  && cr.length== 8) 
			 ||(cmds=="MLLLLZ" && cr.length==10) ) {
				if(cr.length==10) cr=cr.slice(0,8);
				if(bb==null) {
					bb=[cr[0],cr[1],cr[0],cr[1]];
					for(var i=0; i<cr.length; i+=2) {  var x=cr[i],y=cr[i+1];  if(x<bb[0])bb[0]=x;  if(y<bb[1])bb[1]=y;  if(bb[2]<x)bb[2]=x;  if(bb[3]<y)bb[3]=y;  }
				}
				var x0=bb[0],y0=bb[1],x1=bb[2],y1=bb[3];
				if(!sameRect) sameRect = sameCrd8(cr, [x0,y0,x1,y0,x1,y1,x0,y1]);
				if(!sameRect) sameRect = sameCrd8(cr, [x0,y1,x1,y1,x1,y0,x0,y0]);
			}
			return sameRect;
		},
		boxArea: function(a) {  var w=a[2]-a[0], h=a[3]-a[1];  return w*h;  },
		newPath: function(gst    ) {  gst.pth = {cmds:[], crds:[]};  },
		moveTo : function(gst,x,y) {  var p=UDOC.M.multPoint(gst.ctm,[x,y]), pth=gst.pth, cl=pth.cmds.length;  //if(gst.cpos[0]==p[0] && gst.cpos[1]==p[1]) return;
										if(cl!=0 && pth.cmds[cl-1]=="M") {  pth.cmds.pop();  pth.crds.pop();  pth.crds.pop();  }  // avoid several "M"s
										gst.pth.cmds.push("M");  gst.pth.crds.push(p[0],p[1]);  gst.cpos = p;  },
		lineTo : function(gst,x,y) {  var p=UDOC.M.multPoint(gst.ctm,[x,y]);  if(gst.cpos[0]==p[0] && gst.cpos[1]==p[1]) return;
										gst.pth.cmds.push("L");  gst.pth.crds.push(p[0],p[1]);  gst.cpos = p;  },
		curveTo: function(gst,x1,y1,x2,y2,x3,y3) {   var p;  
			if(gst.pth.cmds.length==0) UDOC.G.moveTo(gst,0,0);
			p=UDOC.M.multPoint(gst.ctm,[x1,y1]);  x1=p[0];  y1=p[1];
			p=UDOC.M.multPoint(gst.ctm,[x2,y2]);  x2=p[0];  y2=p[1];
			p=UDOC.M.multPoint(gst.ctm,[x3,y3]);  x3=p[0];  y3=p[1];  gst.cpos = p;
			gst.pth.cmds.push("C");  
			gst.pth.crds.push(x1,y1,x2,y2,x3,y3);  
		},
		closePath: function(gst  ) {  gst.pth.cmds.push("Z");  },
		arc : function(gst,x,y,r,a0,a1, neg) {
			
			// circle from a0 counter-clock-wise to a1
			if(neg) while(a1>a0) a1-=2*Math.PI;
			else    while(a1<a0) a1+=2*Math.PI;
			var th = (a1-a0)/4;
			
			var x0 = Math.cos(th/2), y0 = -Math.sin(th/2);
			var x1 = (4-x0)/3, y1 = y0==0 ? y0 : (1-x0)*(3-x0)/(3*y0);
			var x2 = x1, y2 = -y1;
			var x3 = x0, y3 = -y0;
			
			var p0 = [x0,y0], p1 = [x1,y1], p2 = [x2,y2], p3 = [x3,y3];
			
			var pth = {cmds:[(gst.pth.cmds.length==0)?"M":"L"], crds:[x0,y0]};
			
			var rot = [1,0,0,1,0,0];
			
			for(var i=0; i<4; i++) {
				p1 = UDOC.M.multPoint(rot,p1);  p2 = UDOC.M.multPoint(rot,p2);  p3 = UDOC.M.multPoint(rot,p3);
				pth.crds.push(p1[0],p1[1],p2[0],p2[1],p3[0],p3[1]);  pth.cmds.push("C");
				if(i==0) UDOC.M.rotate(rot,-th);
			}
			
			var sc = [r,0,0,r,x,y];  
			UDOC.M.rotate(rot, -a0+th/2);  UDOC.M.concat(rot, sc);  UDOC.M.multArray(rot, pth.crds);
			UDOC.M.multArray(gst.ctm, pth.crds);
			
			UDOC.G.concat(gst.pth, pth);
			var y=pth.crds.pop();  x=pth.crds.pop();
			gst.cpos = [x,y];
		},
		drawRect : function(gst, x,y,w,h) {
			UDOC.G.moveTo(gst,x,y);  UDOC.G.lineTo(gst,x+w,y);  UDOC.G.lineTo(gst,x+w,y+h);  UDOC.G.lineTo(gst,x,y+h);  UDOC.G.closePath(gst);  
		},
		toPoly : function(p) {
			if(p.cmds[0]!="M" || p.cmds[p.cmds.length-1]!="Z") return null;
			for(var i=1; i<p.cmds.length-1; i++) if(p.cmds[i]!="L") return null;
			var out = [], cl = p.crds.length;
			if(p.crds[0]==p.crds[cl-2] && p.crds[1]==p.crds[cl-1]) cl-=2;
			for(var i=0; i<cl; i+=2) out.push([p.crds[i],p.crds[i+1]]);
			if(UDOC.G.polyArea(p.crds)<0) out.reverse();
			return out;
		},
		fromPoly : function(p) {
			var o = {cmds:[],crds:[]};
			for(var i=0; i<p.length; i++) { o.crds.push(p[i][0], p[i][1]);  o.cmds.push(i==0?"M":"L");  }
			o.cmds.push("Z");
			return o;
		},
		polyArea : function(p) {
			if(p.length <6) return 0;
			var l = p.length - 2;
			var sum = (p[0]-p[l]) * (p[l+1]+p[1]);
			for(var i=0; i<l; i+=2)
				sum += (p[i+2]-p[i]) * (p[i+1]+p[i+3]);
			return - sum * 0.5;
		},
		polyClip : function(p0, p1) {  // p0 clipped by p1
            var cp1, cp2, s, e;
            var inside = function (p) {
                return (cp2[0]-cp1[0])*(p[1]-cp1[1]) > (cp2[1]-cp1[1])*(p[0]-cp1[0]);
            };
            var isc = function () {
                var dc = [ cp1[0] - cp2[0], cp1[1] - cp2[1] ],
                    dp = [ s[0] - e[0], s[1] - e[1] ],
                    n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
                    n2 = s[0] * e[1] - s[1] * e[0], 
                    n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
                return [(n1*dp[0] - n2*dc[0]) * n3, (n1*dp[1] - n2*dc[1]) * n3];
            };
            var out = p0;
            cp1 = p1[p1.length-1];
            for (j in p1) {
                var cp2 = p1[j];
                var inp = out;
                out = [];
                s = inp[inp.length - 1]; //last on the input list
                for (i in inp) {
                    var e = inp[i];
                    if (inside(e)) {
                        if (!inside(s)) {
                            out.push(isc());
                        }
                        out.push(e);
                    }
                    else if (inside(s)) {
                        out.push(isc());
                    }
                    s = e;
                }
                cp1 = cp2;
            }
            return out
        }
	}
	UDOC.M = {
		getScale : function(m) {  return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]));  },
		translate: function(m,x,y) {  UDOC.M.concat(m, [1,0,0,1,x,y]);  },
		rotate   : function(m,a  ) {  UDOC.M.concat(m, [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a),0,0]);  },
		scale    : function(m,x,y) {  UDOC.M.concat(m, [x,0,0,y,0,0]);  },
		concat   : function(m,w  ) {  
			var a=m[0],b=m[1],c=m[2],d=m[3],tx=m[4],ty=m[5];
			m[0] = (a *w[0])+(b *w[2]);       m[1] = (a *w[1])+(b *w[3]);
			m[2] = (c *w[0])+(d *w[2]);       m[3] = (c *w[1])+(d *w[3]);
			m[4] = (tx*w[0])+(ty*w[2])+w[4];  m[5] = (tx*w[1])+(ty*w[3])+w[5]; 
		},
		invert   : function(m    ) {  
			var a=m[0],b=m[1],c=m[2],d=m[3],tx=m[4],ty=m[5], adbc=a*d-b*c;
			m[0] = d/adbc;  m[1] = -b/adbc;  m[2] =-c/adbc;  m[3] =  a/adbc;
			m[4] = (c*ty - d*tx)/adbc;  m[5] = (b*tx - a*ty)/adbc;
		},
		multPoint: function(m, p ) {  var x=p[0],y=p[1];  return [x*m[0]+y*m[2]+m[4],   x*m[1]+y*m[3]+m[5]];  },
		multArray: function(m, a ) {  for(var i=0; i<a.length; i+=2) {  var x=a[i],y=a[i+1];  a[i]=x*m[0]+y*m[2]+m[4];  a[i+1]=x*m[1]+y*m[3]+m[5];  }  }
	}
	UDOC.C = {
		srgbGamma : function(x) {  return x < 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055;  },
		cmykToRgb : function(clr) { 
			var c=clr[0], m=clr[1], y=clr[2], k=clr[3];
			//c+=k; m+=k; y+=k; 
			// return [1-Math.min(1,c+k), 1-Math.min(1, m+k), 1-Math.min(1,y+k)];
			var r = 255
			+ c * (-4.387332384609988  * c + 54.48615194189176  * m +  18.82290502165302  * y + 212.25662451639585 * k +  -285.2331026137004) 
			+ m * ( 1.7149763477362134 * m - 5.6096736904047315 * y + -17.873870861415444 * k - 5.497006427196366) 
			+ y * (-2.5217340131683033 * y - 21.248923337353073 * k +  17.5119270841813) 
			+ k * (-21.86122147463605  * k - 189.48180835922747);
			var g = 255
			+ c * (8.841041422036149   * c + 60.118027045597366 * m +  6.871425592049007  * y + 31.159100130055922 * k +  -79.2970844816548) 
			+ m * (-15.310361306967817 * m + 17.575251261109482 * y +  131.35250912493976 * k - 190.9453302588951) 
			+ y * (4.444339102852739   * y + 9.8632861493405    * k -  24.86741582555878) 
			+ k * (-20.737325471181034 * k - 187.80453709719578);
			var b = 255
			+ c * (0.8842522430003296  * c + 8.078677503112928  * m +  30.89978309703729  * y - 0.23883238689178934 * k + -14.183576799673286) 
			+ m * (10.49593273432072   * m + 63.02378494754052  * y +  50.606957656360734 * k - 112.23884253719248) 
			+ y * (0.03296041114873217 * y + 115.60384449646641 * k + -193.58209356861505)
			+ k * (-22.33816807309886  * k - 180.12613974708367);

			return [Math.max(0, Math.min(1, r/255)), Math.max(0, Math.min(1, g/255)), Math.max(0, Math.min(1, b/255))];
			//var iK = 1-c[3];  
			//return [(1-c[0])*iK, (1-c[1])*iK, (1-c[2])*iK];  
		},
		labToRgb  : function(lab) {
			var k = 903.3, e = 0.008856, L = lab[0], a = lab[1], b = lab[2];
			var fy = (L+16)/116, fy3 = fy*fy*fy;
			var fz = fy - b/200, fz3 = fz*fz*fz;
			var fx = a/500 + fy, fx3 = fx*fx*fx;
			var zr = fz3>e ? fz3 : (116*fz-16)/k;
			var yr = fy3>e ? fy3 : (116*fy-16)/k;
			var xr = fx3>e ? fx3 : (116*fx-16)/k;
				
			var X = xr*96.72, Y = yr*100, Z = zr*81.427, xyz = [X/100,Y/100,Z/100];
			var x2s = [3.1338561, -1.6168667, -0.4906146, -0.9787684,  1.9161415,  0.0334540, 0.0719453, -0.2289914,  1.4052427];
			
			var rgb = [ x2s[0]*xyz[0] + x2s[1]*xyz[1] + x2s[2]*xyz[2],
						x2s[3]*xyz[0] + x2s[4]*xyz[1] + x2s[5]*xyz[2],
						x2s[6]*xyz[0] + x2s[7]*xyz[1] + x2s[8]*xyz[2]  ];
			for(var i=0; i<3; i++) rgb[i] = Math.max(0, Math.min(1, UDOC.C.srgbGamma(rgb[i])));
			return rgb;
		}
	}
	
	UDOC.getState = function(crds) {
		return {
			font : UDOC.getFont(),
			dd: {flat:1},  // device-dependent
			// fill
			ca    : 1,
			colr  : [0,0,0],
			space :"/DeviceGray",
			// stroke
			CA    : 1,
			COLR  : [0,0,0],
			sspace:"/DeviceGray",
			
			bmode: "/Normal",
			SA:false, OPM:0, AIS:false, OP:false, op:false, SMask:"/None",
			lwidth : 1,
			lcap: 0,
			ljoin: 0,
			mlimit: 10,
			SM : 0.1,
			doff: 0,
			dash: [],
			ctm : [1,0,0,1,0,0],
			cpos: [0,0],
			pth : {cmds:[],crds:[]}, 
			cpth: crds ? UDOC.G.rectToPath(crds) : null,  // clipping path
			cpstack: []
		};
	}
	
	UDOC.getFont = function() {
		return {
			Tc: 0, // character spacing
			Tw: 0, // word spacing
			Th:100, // horizontal scale
			Tl: 0, // leading
			Tf:"Helvetica-Bold", 
			Tfs:1, // font size
			Tmode:0, // rendering mode
			Trise:0, // rise
			Tk: 0,  // knockout
			Tal:0,  // align, 0: left, 1: right, 2: center
			Tun:0,  // 0: no, 1: underline
			
			Tm :[1,0,0,1,0,0],
			Tlm:[1,0,0,1,0,0],
			Trm:[1,0,0,1,0,0]
		};
	}	
	
	
	
	function FromPS ()
	{
	}
	
	FromPS.Parse = function(buff, genv)
	{
		buff = new Uint8Array(buff);
		var off = 0;  while(!(buff[off]==37 && buff[off+1]==33)) off++;
		var str = FromPS.B.readASCII(buff, off, buff.length-off);
		var lines = str.split(/[\n\r]+/);
		
		var crds = null;
		var epsv = null;
		
		//var prv="", gotPRV = false;
		
		for(var li=0; li<lines.length; li++)
		{
			var line = lines[li].trim();
			if(line.charAt(0)=="%") {
				line = line.slice(1);
				//if(line=="AI9_PrivateDataEnd") gotPRV = false;
				//if(gotPRV) prv+=line;
				//if(line=="AI9_DataStream"    ) gotPRV = true;
				while(line.charAt(0)=="%") line = line.slice(1);
				var pts = line.split(":");
				if(pts[0]=="BoundingBox")  {crds = pts[1].trim().split(/[ ]+/).map(parseFloat);  }
				if(line.indexOf("!PS-Adobe-3.0 EPSF-3.0")!=-1) epsv=line;
				if(line.indexOf("!PS-Adobe-2.0 EPSF-1.2")!=-1) epsv=line;
			}
		}
		/*
		if(prv!="" && false) {
			//console.log(prv);
			var buf = new Uint8Array(prv.length);
			for(var i=0; i<prv.length; i++) buf[i]=prv.charCodeAt(i);
			var bin = FromPS.F.ASCII85Decode({buff:buf, off:0});
			var bytes = pako["inflate"](bin);
			FileLoader.save(bytes.buffer, "file.eps");
		}*/
		
		if(epsv==null || crds==null) crds = [0,0,595, 842];
		
		var os = [];	// operand stack
		var ds = FromPS._getDictStack([],{});
		var es = [{  typ:"file", val: {  buff:buff, off:off  }  }];	// execution stack
		var gs = [];
		var env = FromPS._getEnv(crds);
		var time = Date.now();
		var repeat = true;
		while(repeat) repeat = FromPS.step(os, ds, es, gs, env, genv);
		
		if(env.pgOpen) genv.ShowPage();
		genv.Done();
		//FromPS.interpret(file, os, ds, es, [], gst, genv);
		console.log(Date.now()-time);
	}
	FromPS._getDictStack = function(adefs, aprcs) {
		var defs = [
			"def","undef","known","begin","end","currentfile","currentdict",
			"currentpacking","setpacking","currentoverprint","setoverprint","currentglobal","setglobal",
			"gcheck",
			"currentsystemparams","setsystemparams","currentuserparams","setuserparams","currentpagedevice","setpagedevice",
			"currentflat",
			"currentlinewidth","currentdash","currentpoint","currentscreen","setscreen","currenthalftone",
			"currentblackgeneration","currentundercolorremoval","currentcolortransfer",
			"internaldict",
			"dict","string","readstring","readhexstring","readline","getinterval","putinterval","token",
			"array","aload","astore","length","maxlength","matrix","count","mark","counttomark","cleartomark","dictstack","countdictstack",
			"makepattern",
			"makefont","scalefont","stringwidth",
			
			"setfont", 
			"currentcolorspace","setcolorspace","setcolor","_setHSB_",
			//"setgray","setrgbcolor","sethsbcolor", 
			"currentgray","currentrgbcolor",
			"setlinewidth", "setstrokeadjust","setflat","setlinecap",
			"setlinejoin","setmiterlimit","setdash",
			"clip","eoclip","clippath","pathbbox",
			"newpath", "stroke", "fill", "eofill", "shfill", "closepath","flattenpath","showpage","print",
			"_drawRect_", "moveto", "lineto", "curveto", "arc","arcn", 
			"show","ashow","xshow","yshow","xyshow","widthshow","awidthshow","charpath",
			"cshow",
			"rmoveto","rlineto","rcurveto",
			"translate","rotate","scale","concat","concatmatrix","invertmatrix","currentmatrix","defaultmatrix","setmatrix",
			
			"limitcheck",
			
			"save","restore","clipsave","cliprestore","gsave", "grestore","grestoreall",
			"usertime","readtime",
			"flush","flushfile","readonly","executeonly",
			
			"findresource","resourcestatus","defineresource","undefineresource","resourceforall",
			
			"image","imagemask","colorimage",
			
			"xcheck","status","cachestatus","setcachelimit","type",
			
			"if","ifelse","exec","stopped","stop","dup","exch","copy","roll","index","anchorsearch",
			"pop","put","get","load","where","store","repeat","for","forall","pathforall","loop","exit",
			"bind",
			"cvi","cvr","cvs","cvx","cvn","cvlit",
			"add","sub","mul","div","idiv","bitshift","mod","exp","atan",
			"neg","abs","floor","ceiling","round","truncate","sqrt","ln","sin","cos",
			"srand","rand","==","transform","itransform","dtransform","idtransform",
			"eq","ge","gt","le","lt","ne",
			"and","or","not",
			"filter",
			
			"begincmap","endcmap", "begincodespacerange","endcodespacerange", "beginbfrange","endbfrange","beginbfchar","endbfchar"
			
		].concat(adefs);
		
		var withCtx = ["image", "colorimage", "repeat", "for","forall","loop"];
		for(var i=0; i<withCtx.length; i++) defs.push(withCtx[i]+"---");
		
		FromPS._myOps = FromPS.makeProcs({ 
			"CIDSystemInfo": "/CIDSystemInfo",  // some PDF ToUnicode entries have "CIDSystemInfo" instead of "/CIDSystemInfo"
		
			"findfont"    : "/Font findresource",
			"definefont"  : "/Font defineresource",
			"undefinefont": "/Font undefineresource",
			
			"selectfont"  : "exch findfont exch scalefont setfont",  //  key  scale  selectfont - 
			
			"rectfill"    : "gsave newpath _drawRect_  fill   grestore",
			"rectstroke"  : "gsave newpath _drawRect_  stroke grestore",
			"rectclip"    : "newpath _drawRect_  clip newpath",
			
			"setgray"     : "/DeviceGray setcolorspace setcolor",
			"setrgbcolor" : "/DeviceRGB  setcolorspace setcolor",
			"sethsbcolor" : "/DeviceRGB  setcolorspace _setHSB_",
			"setcmykcolor": "/DeviceCMYK setcolorspace setcolor",
			"setpattern"  : "/Pattern    setcolorspace setcolor"
		});
		for(var op in FromPS._myOps) defs.push(op);
		
		prcs = aprcs;
		//for(var p in aprcs) prcs[p] = aprcs[p];
		
		var systemdict = {}, globaldict = {}, userdict = {}, statusdict = {};
		systemdict["systemdict"] = {typ:"dict", val:systemdict};
		systemdict["globaldict"] = {typ:"dict", val:globaldict};
		systemdict["userdict"  ] = {typ:"dict", val:userdict  };
		systemdict["statusdict"] = {typ:"dict", val:statusdict};
		systemdict["GlobalFontDirectory"] = systemdict["SharedFontDirectory"] = {typ:"dict", val:{}};
		systemdict["FontDirectory"] = {typ:"dict", val:{}};
		systemdict["$error"    ] = {typ:"dict", val:{}};
		systemdict["errordict" ] = {typ:"dict", val:FromPS.makeProcs({"handleerror":""})};
		systemdict["null" ]      = {typ:"null", val:null};
		systemdict["true" ]      = {typ:"boolean", val:true };
		systemdict["false"]      = {typ:"boolean", val:false};
		
		systemdict["product"      ] = {typ:"string" , val:FromPS.makeStr("Photopea") };
		systemdict["version"      ] = {typ:"string" , val:[51]}
		systemdict["languagelevel"] = {typ:"integer", val:3};
		
		for(var i=0; i<defs.length; i++) systemdict[defs[i]] = {  typ:"operator", val:defs[i]  };
		for(var p in prcs)               systemdict[p] = prcs[p];
		
		return [ systemdict,	globaldict, userdict ];  // dictionary stack
	}
	FromPS._getEnv   = function(crds) {
		var env = {
			bb:crds,
			gst : UDOC.getState(crds),
			"packing":false, "overprint":false, "global":false, "systemparams":{"MaxPatternCache":{type:"integer",val:5000}},userparams:{},
			"pagedevice":{
				"PageSize":{typ:"array",val:[{typ:"real",val:crds[2]},{typ:"real",val:crds[3]}]}
			},
			cmnum:0, fnt:null,
			res:{},
			pgOpen:false,
			funs: FromPS.makeProcs({ 
				"blackgeneration"   : "",
				"undercolorremoval" : "pop 0"
			})
		}
		var rks;
		rks = ["Font","CIDFont","CMap","FontSet","Form","Pattern","ProcSet","Halftone","ColorRendering","IdiomSet",
					"InkParams","TrapParams","OutputDevice","ControlLanguage","Localization","PDL","HWOptions"];
		for(var i=0; i<rks.length; i++) env.res[rks[i]] = {typ:"dict" ,val:{},maxl:1000};
		
		rks = ["Encoding","ColorSpace"];
		for(var i=0; i<rks.length; i++) env.res[rks[i]] = {typ:"array",val:[]};
		
		env.res["Category"] = {typ:"dict",val:env.res};
		env.res["ColorSpace"].val = [
			{typ:"array",val:[{typ:"name",val:"/DeviceRGB"}]},
			{typ:"array",val:[{typ:"name",val:"/DeviceCMYK"}]},
			{typ:"array",val:[{typ:"name",val:"/DeviceGray"}]}
		];
		
		/*"Filter","ColorSpaceFamily","Emulator","IODevice" */
		
		for(var i=0; i<rks.length; i++) env.res[rks[i]] = {typ:"dict",val:{},maxl:1000};
		
		return env;
	}
	
	FromPS.makeProcs = function(prcs) {
		var out = {};
		for(var p in prcs) {
			var pts = prcs[p].replace(/  +/g, " ").split(" ");
			out[p] = {typ:"procedure", val:[]};
			for(var i=0; i<pts.length; i++) out[p].val.push({typ:"name",val:pts[i]});
		}
		return out;
	}
	
	FromPS.addProc = function(obj, es) {  
		if(obj.val.length==0) return;
		if(obj.typ!="procedure") {  console.log(obj);  throw obj.typ;  }
		es.push({typ:"procedure",val:obj.val, off:0});
		//if(obj.off!=null && obj.off!=obj.val.length)   es.push({typ:"procedure", val:obj.val, off:0}); 
		//else {  obj.off=0;  es.push( obj );  }
	}
	
	FromPS.stepC = 0;
	FromPS._f32 = new Float32Array(1);
	FromPS.step = function(os, ds, es, gs, env, genv, Oprs, stopOnError) 
	{
		var otime = Date.now(), f32 = FromPS._f32;
		var getToken = FromPS.getToken;
		
		var gst = env.gst;
		
		var tok = getToken(es, ds);  if(tok==null) return false;
		if(stopOnError && tok.typ=="string" && FromPS.readStr(tok.val)=="def") tok={typ:"operator",val:"def"};  // N03-N1.PDF
		var typ = tok.typ, val = tok.val;
		
		if(isNaN(gst.cpos[0])) throw "e";
		
		var DEBUG = false;
		//DEBUG = FromPS.stepC++>10000;
		
		//console.log(tok);
		if(DEBUG) console.log(tok, os.slice(0));
		
		//for(var i=0; i<os.length; i++)  if(os[i].typ=="real" && isNaN(os[i].val)) throw "e";
		
		/*ocnt++;
		//if(ocnt>2*lcnt) {  lcnt=ocnt;  console.log(ocnt, os.length, file.stk.length);  };
		if(ocnt>8000000) {  
			for(var key in opoc) if(opoc[key][1]<1000) delete opoc[key];
			console.log(Date.now()-otime, opoc);  throw "e";  
		} */
		
		if(["integer","real","dict","boolean","string","array","procedure","null","file"].indexOf(typ)!=-1) {  os.push(tok);  return true;  }
	
		if(typ!="name" && typ!="operator") throw "e";
		
		//if(opoc[val]==null) opoc[val]=[0,0];  opoc[val][0]++;  opoc[val][1]=ocnt;
			
		if(val.charAt(0)=="/") {
			//if(val.charAt(1)=="/") throw "e";
			//else 
				os.push(tok);
		}
		else if(val.startsWith("II*")) return false;
		else if(val=="{") {
			var ars = [], car = {typ:"procedure", val:[] };
			
			var ltok=getToken(es,ds); 
			while(true) {  
				if     (ltok.val=="{") {  var ncr = {typ:"procedure", val:[]};  car.val.push(ncr);  ars.push(car);  car=ncr;  }
				else if(ltok.val=="}") {  if(ars.length==0) break;  car = ars.pop();  }		
				else car.val.push(ltok);
				ltok=getToken(es,ds);  
			}
			os.push( car );
		}
		else if(val=="[" || val=="<<") os.push( {typ:"mark"} );
		else if(val=="]" || val==">>") {
			var arr = [];  while(os.length!=0) {  var o=os.pop();  if(o.typ=="mark") break;  arr.push(o);  }
			arr.reverse(); 
			if(val=="]") os.push( {typ:"array", val:arr } ); 
			else { 
				var ndct = {};  for(var i=0; i<arr.length; i+=2) ndct[arr[i].val.slice(1)] = arr[i+1];
				os.push( {typ:"dict", val:ndct, maxl:1000 } ); 
			}
		}
		else {
			var obj = FromPS.getFromStacks(val, ds);
			if(DEBUG) console.log("---", obj);
			
			//if(val=="rl^") {  console.log(val, os.slice(0));    }
			if(obj==null) {  
				if(stopOnError) return false;
				else {  console.log("unknown operator", val, os, ds);  throw "e";  }  
			}
			else if(obj.typ=="procedure") FromPS.addProc(obj, es); //{  obj.off=0;  es.push(obj);  }
			/*
			else if(op.typ=="string") {
				var prc=[], sdta = {buff:op.val, off:0, stk:[]}, tk = getToken(sdta);  while(tk!=null) {  prc.push(tk);  tk=getToken(sdta);  }
				FromPS.addProcedure(prc, file);
			}*/
			else if(["array","string","dict","null","integer","real","boolean","state","name","file"].indexOf(obj.typ)!=-1) os.push(obj);
			else if(obj.typ=="operator")
			{
				var op = obj.val;
				//console.log(op);
				//if(omap[op]) op = omap[op];
				
				var ops = ["known","if","ifelse","currentpacking","setpacking","dict","dup","begin","end","put","bind","def","undef","where","pop",
				"get","exec","ge","stop","stopped","cvr","string","not","and"];
				//if(ops.indexOf(op)==-1) throw op;
				
				if(FromPS._myOps[op]) {  FromPS.addProc(FromPS._myOps[op],es);   }
				else if(op=="flattenpath" || op=="limitcheck") {    }
				else if(op=="def") {  var nv = os.pop(), nn = os.pop();  if(nn==null && stopOnError) return false;  nn=FromPS.getDKey(nn);  ds[ds.length-1][nn] = nv;  }
				else if(op=="undef" || op=="known") {
					var key=FromPS.getDKey(os.pop()), dvl=os.pop(), dct=dvl.val;  //console.log(op, dct, key);
					if(op=="undef") delete dct[key];
					else os.push({typ:"boolean",val:(dvl.typ!="null" && dct[key]!=null)});
				}
				else if(op=="internaldict") {  var l=os.pop().val;  os.push({typ:"dict"  , val:{}, maxl:1000});  }
				else if(op=="dict"   ) {  var l=os.pop().val;  os.push({typ:"dict"  , val:{}, maxl:l });  }
				else if(op=="string" ) {  var l=os.pop().val;  os.push({typ:"string", val:new Array(l) });  }
				else if(op=="readstring" || op=="readhexstring") {
					var str = os.pop(), l=str.val.length, ofl = os.pop(), fl = FromPS.GetFile(ofl).val;  //console.log(op, str, ofl, os);//  throw "e";
					if(op=="readstring") {  for(var i=0; i<l; i++) str.val[i]=fl.buff[fl.off+i];   fl.off+=l;  }
					else                    FromPS.readHex(fl, l, str.val);
					os.push(str, {typ:"boolean",val:true});
				}
				else if(op=="readline") {
					var str = os.pop(), fl = FromPS.GetFile(os.pop()).val, i=0;
					//console.log(op, PUtils.readASCII(fl.buff,fl.off,64), fl.buff[fl.off], fl.buff[fl.off+1]);
					if(FromPS.isEOL(fl.buff[fl.off])) fl.off++;//{  console.log(PUtils.readASCII(fl.buff,fl.off-8,32));  throw "e";  }  //fl.off++;
					while(i<str.val.length)  {
						var cc = fl.buff[fl.off];  fl.off++;
						if(cc==null) throw "e";
						if(FromPS.isEOL(cc)) {  if(fl.buff[fl.off]==10) fl.off++;  break;  }
						str.val[i]=cc;   i++;
					}
					os.push({typ:"string" ,val:str.val.slice(0,i)});
					os.push({typ:"boolean",val:true});
				}
				else if(op=="getinterval") {
					var cnt = os.pop().val, idx = os.pop().val, src = os.pop(), out=[];
					if(src.typ=="string" || src.typ=="array") for(var i=0; i<cnt; i++) out.push(src.val[idx+i]);
					else throw "e";
					//console.log(idx,cnt,out.slice(0));
					os.push({typ:src.typ, val:out});
				}
				else if(op=="putinterval") {
					var src=os.pop(), idx=os.pop().val, tgt=os.pop();  //console.log(tgt,idx,src);
					if(idx+src.val.length>=tgt.val.length) {}  //throw "e";
					else if(src.typ=="string") for(var i=0; i<src.val.length; i++) tgt.val[idx+i] = src.val[i];
					else throw "e";
					//console.log(src.val, tgt.val, idx);  throw "e";
				}
				else if(op=="token") {
					var src = os.pop();  if(src.typ!="string") throw "e";
					var arr = [];
					for(var i=0; i<src.val.length; i++) {  var bv=src.val[i];  if(bv==null) break;  arr.push(bv);  }
					var nfl = {  buff:new Uint8Array(arr), off:0   }, tok = getToken([{typ:"file",val:nfl}], ds);
					var ns = [];  for(var i=nfl.off; i<arr.length; i++) ns.push(arr[i]);
					os.push({typ:"string",val:ns}, tok, {typ:"boolean",val:true});
				}
				else if(op=="array"  ) {  var l=os.pop().val;  os.push({typ:"array" , val:new Array(l) });  }
				else if(op=="aload"){
					var o = os.pop(), arr = o.val;
					for(var i=0; i<arr.length; i++) os.push(arr[i]);
					os.push(o);
				}
				else if(op=="astore") {
					var o=os.pop(), arr = o.val;  //console.log(arr.length);  throw "e";
					for(var i=0; i<arr.length; i++) arr[arr.length-1-i]=os.pop();
					os.push(o);
				}
				else if(op=="length" ) {
					var o = os.pop(), typ=o.typ, l=0;
					if     (typ=="array"    ) l = o.val.length;
					else if(typ=="procedure") l = o.val.length;
					else if(typ=="dict"     ) l = Object.keys(o.val).length;
					else if(typ=="string"   ) l = o.val.length;
					else {  console.log(o);  throw "e";  }
					os.push({typ:"integer",val:l});
				}
				else if(op=="maxlength") {  var d=os.pop();  os.push({typ:"integer",val:d.maxl});  }
				else if(op=="matrix" ) {  os.push({typ:"array", val:FromPS.makeArr([1,0,0,1,0,0],"real") });  }
				else if(op=="count"  ) {  os.push({typ:"integer", val:os.length});  }
				else if(op=="mark"   ) {  os.push({typ:"mark"});  }
				else if(op=="counttomark" || op=="cleartomark") {
					var mi = 0;  while(mi<os.length && os[os.length-1-mi].typ!="mark")mi++;
					if(op=="cleartomark") for(var i=0; i<mi+1; i++) os.pop();
					else os.push({typ:"integer",val:mi});
				}
				else if(op=="dictstack") {
					var arr = os.pop();
					for(var i=0; i<ds.length; i++) arr.val[i] = {typ:"dict",val:ds[i],maxl:1000};
					os.push(arr);
				}
				else if(op=="countdictstack") {
					var n=0;  for(var i=0; i<os.length; i++) if(os[i].typ=="dict") n++;
					os.push({typ:"integer",val:n});
				}
				else if(op=="begin") {  var o = os.pop(), dct=o.val;   if(dct==null || o.typ!="dict") {  console.log(o, ds);  throw "e";  }  ds.push(dct);  }
				else if(op=="end"  ) {  ds.pop();  }
				else if(op=="currentfile") {  var file;  for(var i=es.length-1; i>=0; i--) if(es[i].typ=="file"){file=es[i];break;}  os.push({typ:"file",val:file.val});  }
				else if(op=="currentdict") {  var dct=ds[ds.length-1];  os.push({typ:"dict", val:dct, maxl:1000});  }
				else if(["currentpacking","currentoverprint","currentglobal","currentsystemparams","currentuserparams","currentpagedevice"].indexOf(op)!=-1) {  
					var nv = env[op.slice(7)];
					os.push({typ:(typeof nv=="boolean")?"boolean":"dict",val:nv});  
				}
				else if(op=="gcheck") {
					var v = os.pop();  os.push({typ:"boolean",val:false});  //console.log(v, env);  throw "e";
				}
				else if(["setpacking","setoverprint","setglobal","setsystemparams","setuserparams","setpagedevice"].indexOf(op)!=-1) {  env[op.slice(3)] = os.pop().val;  }
				else if(op=="currentflat"   ) {  os.push({typ:"real",val:1});  }
				else if(op=="currentlinewidth") {  os.push({typ:"real",val:gst.lwidth});  }
				else if(op=="currentdash"    ) {  os.push({typ:"array",val:FromPS.makeArr(gst.dash,"integer")}, {typ:"real",val:gst.doff});  }
				else if(op=="currentpoint"   ) {  var im=gst.ctm.slice(0);  UDOC.M.invert(im);  var p=UDOC.M.multPoint(im,gst.cpos);  
								os.push({typ:"real",val:p[0]}, {typ:"real",val:p[1]});  }
				else if(op=="currentscreen"  ) {  os.push({typ:"int",val:60}, {typ:"real",val:0},{typ:"real",val:0});  }
				else if(op=="setscreen"      ) {  os.pop();  os.pop();  os.pop();  }
				else if(op=="currenthalftone") {  os.push({typ:"dict",val:{},maxl:1000});  }
				else if(op=="currentblackgeneration" || op=="currentundercolorremoval") {  os.push(env.funs[op.slice(7)]);  }
				else if(op=="currentcolortransfer") {  for(var i=0; i<4; i++) os.push(env.funs["blackgeneration"]);  }
				else if(op=="findresource")
				{
					//console.log(env.res);
					var cat = os.pop().val.slice(1), okey = os.pop(), key=okey.val.slice(1);
					//console.log(op, cat, key);
					if     (cat=="Font"/* && env.res[cat].val[key]==null*/) {  // if dont't reset matrix to Identity, problems in Gradient.eps
						env.res[cat].val[key] = {typ:"dict",val:{
							"FontType"  :{typ:"integer",val:1},
							"FontMatrix":{typ:"array",val:FromPS.makeArr([1,0,0,1,0,0],"real")},
							"FontName"  :okey,
							"FID"       :{typ:"fontID",val:Math.floor(Math.random()*0xffffff)},
							"Encoding"  :{typ:"array",val:[]},
							"FontBBox"  :{typ:"array",val:FromPS.makeArr([0,0,1,1],"real")},
							"PaintType" :{typ:"integer",val:0}
						}}
					}
					var rs;
					if     (cat=="Category" && key=="Generic") rs = {typ:"dict",val:{},maxl:1000};
					else if(cat=="ProcSet"  && key=="CIDInit") rs = {typ:"dict",val:{},maxl:1000};  // graf do diplomky.pdf
					else                                       rs = env.res[cat].val[key];  
					//console.log(cat, key);
					if(rs==null) throw "e";
					os.push(rs);
				}
				else if(op=="resourcestatus") {
					var cat = os.pop().val.slice(1), key = os.pop().val.slice(1);
					//console.log(op,cat,key);
					var rs = env.res[cat].val[key];  //console.log(rs);
					if(rs) { os.push({typ:"integer",val:1});  os.push({typ:"integer",val:Object.keys(rs.val).length});   }
					os.push({typ:"boolean",val:rs!=null});
				}
				else if(op=="defineresource") {
					var cat = os.pop().val.slice(1), ins = os.pop(), key = os.pop().val.slice(1);
					//console.log(op, cat, key);
					env.res[cat].val[key]=ins;
					os.push(ins);
				}
				else if(op=="undefineresource") {
					//console.log(op, cat, key);
					var cat = os.pop().val.slice(1), key = os.pop().val.slice(1);
					delete env.res[cat].val[key];
				}
				else if(op=="resourceforall") {
					var cat = os.pop().val.slice(1), scra = os.pop().val, proc = os.pop(), tmpl = os.pop().val;
					if(tmpl.length!=1 || tmpl[0]!=42) throw "e";  // *
					//console.log(op, cat, scra, proc, tmpl);  throw "e";
					var catv = env.res[cat].val;
					for(var key in catv) {
						var str = scra.slice(0);
						for(var i=0; i<key.length; i++) str[i]=key[i];  // console.log(str);
						FromPS.addProc(proc,es);
						FromPS.addProc({typ:"procedure",val:[{typ:"string",val:str}]},es);
					}
				}
				else if(op=="image" || op=="colorimage") {
					var w, h, bpc, mat, ncomp=1, multi=false, srcs = [];
					// all components can be in one channel: multi=true;
					
					var top = os.pop();  os.push(top);
					if(op=="image" && top.typ=="dict") {
						var dic = os.pop().val;  //console.log("---------------------------------",dic);
						w = dic["Width"].val;  h = dic["Height"].val;  bpc = dic["BitsPerComponent"].val;  mat = FromPS.readArr(dic["ImageMatrix"].val);
						ncomp = dic["NComponents"]?dic["NComponents"].val:1;  multi = dic["MultipleDataSources"]?dic["MultipleDataSources"].val:false;
						srcs = dic["DataSource"].val;  //console.log(srcs);  throw "e";
						if(dic["DataSource"].typ=="file") srcs=[dic["DataSource"]];
						//console.log(op,w,h, ncomp, gst.space, dic);
					}
					else {
						if(op=="colorimage") {  ncomp = os.pop().val;  multi = os.pop().val;  }
						
						if(multi) {  srcs[2]=os.pop();  srcs[1]=os.pop();  srcs[0]=os.pop();  }  else srcs = [os.pop()];
						var mat = FromPS.readArr(os.pop().val), bpc = os.pop().val, h = os.pop().val, w = os.pop().val;						
					}
					if(ncomp!=1 && ncomp!=3 && ncomp!=4) throw "unsupported number of channels "+ncomp;
					if(bpc!=8) throw "unsupported bits per channel: "+bpc;
					
					var img = new Uint8Array(w*h*4);  for(var i=0; i<img.length; i++) img[i]=255;
					//console.log(w,h,bpc,mat, src0,src1,src2, multi, ncomp);  throw "e";
					
					//console.log("multi", multi);
					es.push({typ:"name",val:op+"---",ctx:[w,h,bpc,mat, ncomp,multi,img,0, srcs]});
					//console.log(srcs);
					if(srcs[0].typ=="procedure") for(var i=0; i<srcs.length; i++) FromPS.addProc(srcs[i],es);
					//FromPS.addProc(src0, es);  
					//if(multi) {  FromPS.addProc(src1, es);  FromPS.addProc(src2, es);  }
				}
				else if(op=="image---" || op=="colorimage---") {
					var prm = tok.ctx, w=prm[0], h=prm[1], bpc=prm[2], mat=prm[3], ncomp=prm[4], multi=prm[5], img=prm[6], pind=prm[7], srcs=prm[8];
					//var src0 = prm[8], src1 = prm[9], src2=prm[10], 
					var dlen = 0;
					if(multi) {
						for(i=0; i<ncomp; i++){ 
							var row = srcs[i];
							if(row.typ=="procedure") row = os.pop().val; 
							else row = row.val;
							dlen = row.length;  
							//console.log(os, row);
							//if(!(row instanceof Array)) throw "e";
							if(ncomp==4) for(var j=0; j<dlen; j++) img[(pind+j)*4 + 3-i] = row[j];
							if(ncomp==3) for(var j=0; j<dlen; j++) img[(pind+j)*4 + 2-i] = row[j];
						}
					}
					else  {
						var row;
						if(srcs[0].typ=="file") row = FromPS.GetFile(srcs[0]).val.buff;
						else                    row = os.pop().val;  
						dlen = Math.floor(row.length/3);
						//if(row[0]==null) {  console.log(ds);  throw "e";  }
						for(var j=0; j<dlen; j++) {  var tj=j*3, qj=(pind+j)*4;  img[qj+0]=row[tj+0];  img[qj+1]=row[tj+1];  img[qj+2]=row[tj+2];  }
					}
					pind += dlen;
					FromPS.checkPageStarted(env,genv);
					if(pind==w*h) {
						var i2=1/255;
						if(gst.space=="/DeviceCMYK")
						for(var i=0; i<img.length; i+=4) {
							var clr = [img[i]*i2, img[i+1]*i2, img[i+2]*i2, img[i+3]*i2];
							var rgb = UDOC.C.cmykToRgb(clr);
							img[i]=rgb[0]*255;  img[i+1]=rgb[1]*255;  img[i+2]=rgb[2]*255;  img[i+3]=255;
						}
						var ocm = gst.ctm.slice();
						var nm = mat.slice(0);  UDOC.M.invert(nm);
						var sm = [w,0,0,-h,0,h]; 
						UDOC.M.concat(sm,nm); 
						UDOC.M.concat(gst.ctm, sm);
						genv.PutImage(gst, img, w, h);
						gst.ctm=ocm;
					}
					else {  prm[7]=pind;  es.push(tok); 
						if(srcs[0].typ=="procedure")  for(var i=0; i<srcs.length; i++) FromPS.addProc(srcs[i],es);
					}
				}
				else if(op=="makepattern") {
					var m = os.pop().val;
					var d = os.pop().val;
					//console.log(d, d["PatternType"]);  //throw "e";
					os.push({typ:"array",val:[d,JSON.parse(JSON.stringify(m))]});
				}
				else if(op=="makefont" || op=="scalefont") {
					var isMake = op=="makefont";
					var prm = os.pop().val;  if(isMake) prm=FromPS.readArr(prm);
					var fnt = JSON.parse(JSON.stringify(os.pop()));  //console.log(ds);
					var fmat = FromPS.readArr(fnt.val["FontMatrix"].val);  //console.log(fmat);  
					if(isMake) UDOC.M.concat(fmat,prm)
					else       UDOC.M.scale (fmat,prm,prm);  //console.log(fmat);throw "e";
					fnt.val["FontMatrix"].val = FromPS.makeArr(fmat);
					//fnt.val.Tfs *= sc;  
					os.push(fnt);
				}
				else if(op=="stringwidth" || op=="charpath") {
					if(op=="charpath") os.pop();
					var sar = os.pop().val, str=FromPS.readStr(sar); 
					var sc = UDOC.M.getScale(gst.font.Tm) / UDOC.M.getScale(gst.ctm);
					//console.log(FromPS.getString(str), gst.font, 0.55*sc*str.length);
					var sw = 0.55*sc*str.length;
					if(op=="stringwidth") os.push({typ:"real",val:sw}, {typ:"real",val:0});
					else UDOC.G.drawRect(gst,0,0,sw,sc);
				}
				else if(op=="setfont"     ) {
					var fnt = os.pop().val;
					gst.font.Tf = fnt["FontName"].val.slice(1);
					gst.font.Tm = FromPS.readArr(fnt["FontMatrix"].val);
				}
				else if(op=="setlinewidth") gst.lwidth = os.pop().val;
				else if(op=="setstrokeadjust") gst.SA = os.pop().val;
				else if(op=="setlinecap") gst.lcap = os.pop().val;
				else if(op=="setlinejoin") gst.ljoin = os.pop().val;
				else if(op=="setmiterlimit") gst.mlimit = os.pop().val;
				else if(op=="setflat") gst.dd.flat=os.pop();
				else if(op=="setdash"     ) {  gst.doff=os.pop().val;  gst.dash = FromPS.readArr(os.pop().val);  }
				else if(op=="show"||op=="ashow"||op=="xshow"||op=="yshow"||op=="xyshow"||op=="widthshow"||op=="awidthshow") {  
					if(op=="xshow" || op=="xyshow" || op=="yshow") os.pop();
					var sar = os.pop().val, str=FromPS.readStr(sar); 
					if(op=="awidthshow") {  os.pop();  os.pop();  os.pop();  os.pop(); }
					if(op=="widthshow" ) {  os.pop();  os.pop();  os.pop();  }
					if(op=="ashow"     ) {  os.pop();  os.pop();  }
					var om = gst.ctm;  gst.ctm = om.slice(0);  gst.ctm[4]=gst.cpos[0];  gst.ctm[5]=gst.cpos[1];//UDOC.M.translate(gst.ctm,gst.cpos[0],gst.cpos[1]);
					FromPS.checkPageStarted(env,genv);
					//console.log(gst.ctm.slice(0), JSON.parse(JSON.stringify(gst.font)), str);
					genv.PutText(gst, str, str.length*0.55);
					gst.cpos[0] += str.length*UDOC.M.getScale(om)*UDOC.M.getScale(gst.font.Tm)*0.55;  //console.log(str, gst.font.Tfs);
					gst.ctm = om;
				}
				else if(op=="cshow") {  os.pop();  os.pop();  }
				else if(op=="currentcolorspace") {  os.push({typ:"array",val:[{typ:"name",val:gst.space}]});  }
				else if(op=="setcolorspace") {
					var nsp = os.pop();
					gst.space = nsp.val;  //console.log(nsp); //throw "e";
					if(nsp.typ=="array") gst.space=nsp.val[0].val;
					else if(nsp.typ=="name") gst.space = nsp.val;
					else {  console.log(nsp);  throw "e";  }
				}
				else if(op=="setcolor" || op=="_setHSB_") {
					var nclr;
					if(gst.space=="/Pattern") {
						//console.log(gst.ctm.slice(0));
						var clr = os.pop();  if(clr.typ!="array") throw "e";
						var p = clr.val;
						var m = FromPS.readArr(p[1]);
						//console.log(m.slice(0),gst.ctm.slice(0));
						UDOC.M.concat(m,gst.ctm);
						nclr = FromPS.getPSShadingFill(p[0]["Shading"], m);
					}
					else if(gst.space=="/DeviceGray") {
						var g=FromPS.nrm(os.pop().val);  nclr = [g,g,g];
					}
					else if(op=="_setHSB_") {
						var v=os.pop().val,s=os.pop().val,h=os.pop().val;
						var r, g, b, i, f, p, q, t;
						i = Math.floor(h * 6);
						f = h * 6 - i;
						p = v * (1 - s);
						q = v * (1 - f * s);
						t = v * (1 - (1 - f) * s);
						switch (i % 6) {
							case 0: r = v, g = t, b = p; break;
							case 1: r = q, g = v, b = p; break;
							case 2: r = p, g = v, b = t; break;
							case 3: r = p, g = q, b = v; break;
							case 4: r = t, g = p, b = v; break;
							case 5: r = v, g = p, b = q; break;
						}
						nclr = [FromPS.nrm(r),FromPS.nrm(g),FromPS.nrm(b)];
					}
					else if(gst.space=="/DeviceRGB") {
						var b=os.pop().val,g=os.pop().val,r=os.pop().val;  nclr = [FromPS.nrm(r),FromPS.nrm(g),FromPS.nrm(b)];
					}
					else if(gst.space=="/DeviceCMYK") {
						var k=os.pop().val,y=os.pop().val,m=os.pop().val,c=os.pop().val;  nclr = UDOC.C.cmykToRgb([c,m,y,k]);
						//console.log(c,m,y,k);
					}
					else throw gst.space;
					//console.log(gst.space, nclr);
					if(nclr) gst.colr = gst.COLR = nclr;
				}
				else if(op=="currentrgbcolor") {  for(var i=0; i<3; i++) os.push({typ:"real", val:gst.colr[i]});  }
				else if(op=="currentgray") {  os.push({typ:"real", val:(gst.colr[0]+gst.colr[1]+gst.colr[2])/3});  }
				else if(op=="clip" || op=="eoclip") {  
					var bbN = UDOC.G.getBB(gst.pth .crds);
					var bbO = UDOC.G.getBB(gst.cpth.crds);
					if     (UDOC.G.isBox(gst.pth, bbN) && UDOC.G.insideBox(bbO,bbN)) {  }  // clipping with a box, that contains a current clip path
					else if(UDOC.G.isBox(gst.cpth,bbO) && UDOC.G.insideBox(bbN,bbO)) {  gst.cpth = JSON.parse(JSON.stringify(gst.pth));  }
					else {
						var p0 = UDOC.G.toPoly(gst.pth), p1 = UDOC.G.toPoly(gst.cpth);
						if(p0 && p1) {
							//console.log(gst.pth, gst.cpth);
							var p = UDOC.G.polyClip(p0, p1);
							//console.log(p0, p1, p);
							if(p.length!=0) gst.cpth = UDOC.G.fromPoly(p);
							else console.log("strange intersection of polygons");
						}
						else {
							// do an advanced shape - shape intersection
							//console.log("replacing clipping path");
							//console.log(bbO, gst.cpth);
							//console.log(bbN, gst.pth );
							gst.cpth = JSON.parse(JSON.stringify(gst.pth ));  
						}
					}
				}
				else if(op=="clippath" ) {  gst.pth  = JSON.parse(JSON.stringify(gst.cpth));  }
				else if(op=="pathbbox" ) {
					var ps = gst.pth.crds;
					var bb = UDOC.G.getBB(ps);
					ps = [bb[0],bb[1], bb[2],bb[1],   bb[0],bb[3], bb[2],bb[3]];
					var im = gst.ctm.slice(0);  UDOC.M.invert(im);  UDOC.M.multArray(im,ps);
					bb = UDOC.G.getBB(ps);
					f32[0]=bb[0];  bb[0]=f32[0];  f32[0]=bb[1];  bb[1]=f32[0];  f32[0]=bb[2];  bb[2]=f32[0];  f32[0]=bb[3];  bb[3]=f32[0];
					bb = FromPS.makeArr(bb,"real");
					os.push(bb[0],bb[1],bb[2],bb[3]);
				}
				else if(op=="newpath"  ) UDOC.G.newPath(gst);
				else if(op=="stroke"              ) {  FromPS.checkPageStarted(env,genv);  genv.Stroke(gst);  UDOC.G.newPath(gst);  }
				else if(op=="shfill") {
					var ocolr = gst.colr, opth = gst.pth;
					
					var p = os.pop().val;  //console.log(p);
					var m = gst.ctm.slice(0);  //console.log(m, gst.cpos.slice(0));
					//m[4]+=gst.cpos[0];  m[5]+=gst.cpos[1];
					gst.colr = FromPS.getPSShadingFill({typ:"dict",val:p,maxl:1000}, m);
					//gst.colr = [1,0,0];
					
					FromPS.checkPageStarted(env,genv);
					gst.pth = gst.cpth;  gst.cpth = UDOC.G.rectToPath(env.bb);
					genv.Fill(gst);   
					
					gst.colr = ocolr; gst.pth = opth;
					//console.log(op);  throw "e";
				}
				else if(op=="fill" || op=="eofill") {  
					FromPS.checkPageStarted(env,genv);
					
					//var octm = gst.ctm;  gst.ctm=[1,0,0,1,0,0];
					genv.Fill(gst, op=="eofill");  
					//console.log(gst.ctm.slice(0));
					//gst.ctm=octm;
					
					//if(FromPS._fn==null) FromPS._fn=0;  FromPS._fn++;
					//if(FromPS._fn==3) {  console.log(JSON.parse(JSON.stringify(gst)));   }
					//console.log(op);  throw "e";
					//console.log(gst);  throw "e";
					UDOC.G.newPath(gst);  
				}
				else if(op=="showpage" ) {  FromPS.checkPageStarted(env,genv);  genv.ShowPage ();  var ofnt=gst.font;  gst = env.gst = UDOC.getState(env.bb);  gst.font=ofnt;  env.pgOpen = false;  }
				else if(op=="print"    ) {  var sar = os.pop().val, str=FromPS.readStr(sar);  genv.Print(str);  }
				else if(op=="_drawRect_") {
					var h=os.pop();  if(h.typ!="real" && h.typ!="integer") throw "e"; 
					h = h.val;  var w=os.pop().val, y=os.pop().val, x=os.pop().val;
					UDOC.G.drawRect(gst,x,y,w,h);
				}
				else if(op=="closepath") UDOC.G.closePath(gst);
				else if(op=="moveto"  || op=="lineto" ) {
					var y = os.pop().val, x = os.pop().val;
					if(op=="moveto" ) UDOC.G.moveTo(gst,x,y);  else UDOC.G.lineTo(gst,x,y);
				}
				else if(op=="rmoveto" || op=="rlineto") {
					var y = os.pop().val, x = os.pop().val;
					var im=gst.ctm.slice(0);  UDOC.M.invert(im);  var p = UDOC.M.multPoint(im, gst.cpos);
					y+=p[1];  x+=p[0];
					if(op=="rmoveto") UDOC.G.moveTo(gst,x,y);  else UDOC.G.lineTo(gst,x,y);
				}
				else if(op=="curveto") {
					var y3=os.pop().val, x3=os.pop().val, y2=os.pop().val, x2=os.pop().val, y1=os.pop().val, x1=(os.length==0)?0:os.pop().val;
					UDOC.G.curveTo(gst,x1,y1,x2,y2,x3,y3);
				}
				else if(op=="arc" || op=="arcn") {
					var a2 = os.pop().val, a1 = os.pop().val, r = os.pop().val, y = os.pop().val, x = os.pop().val;
					//if(op=="arcn") a2=-a2;
					UDOC.G.arc(gst,x,y,r,a1*Math.PI/180,a2*Math.PI/180, op=="arcn");
				}
				else if(op=="concat") {
					var m = FromPS.readArr(os.pop().val);  //console.log(m);  throw "e";
					UDOC.M.concat(m,gst.ctm);  gst.ctm = m;
				}
				else if(["translate","scale","rotate"].indexOf(op)!=-1) {
					var v = os.pop(), m, x, y;
					if(v.typ=="array") {  m = FromPS.readArr(v.val);  y = os.pop().val;  }
					else  {  m = [1,0,0,1,0,0];  y = v.val;  }
					
					if(op!="rotate") x = os.pop().val;
					
					if(op=="translate") UDOC.M.translate(m,x,y);
					if(op=="scale"    ) UDOC.M.scale    (m,x,y);
					if(op=="rotate"   ) UDOC.M.rotate   (m,-y*Math.PI/180);
					
					if(v.typ=="array") os.push({typ:"array",val:FromPS.makeArr(m,"real")});
					else {  UDOC.M.concat(m,gst.ctm);  gst.ctm = m;  }
				}
				else if(op=="concatmatrix") { var rA = FromPS.readArr;
					var m3 = rA(os.pop().val), m2 = rA(os.pop().val), m1 = rA(os.pop().val);
					var m = m1.slice(0);  UDOC.M.concat(m, m2);  m = FromPS.makeArr(m, "real");
					os.push({typ:"array",val:m});
				}
				else if(op=="invertmatrix") { var rA = FromPS.readArr;
					var m2 = rA(os.pop().val), m1 = rA(os.pop().val);
					var m = m1.slice(0);  UDOC.M.invert(m);  m = FromPS.makeArr(m, "real");
					os.push({typ:"array",val:m});
				}
				else if(op=="currentmatrix" || op=="defaultmatrix") {
					var m = os.pop(), cm = FromPS.makeArr(op=="currentmatrix"?gst.ctm:[1,0,0,1,0,0],"real");
					for(var i=0; i<6; i++) m.val[i]=cm[i];   os.push(m);
				}
				else if(op=="setmatrix") {
					gst.ctm = FromPS.readArr(os.pop().val);
				}
				else if(op=="cvi") {
					var o = os.pop(), v=o.val, out = 0;
					if     (o.typ=="real"   ) out = Math.round(v);
					else if(o.typ=="integer") out = v;
					else throw "unknown type "+o.typ;
					os.push({typ:"integer",val:out});
				}
				else if(op=="cvr") {
					var o = os.pop(), v=o.val, out = 0;
					if     (o.typ=="real"   ) out = v;
					else if(o.typ=="integer") out = v;
					else if(o.typ=="string" ) out = parseFloat(FromPS.readStr(v));
					else throw "unknown type "+o.typ;
					os.push({typ:"real",val:out});
				}
				else if(op=="cvs") {
					var str = os.pop(), any = os.pop(), nv = "";  str.val=[];  os.push(str);
					if(any.typ=="real" || any.typ=="integer") {
						if(Math.abs(Math.round(any.val)-any.val)<1e-6) nv=Math.round(any.val)+".0";
						else nv = (Math.round(any.val*1000000)/1000000).toString();
					}
					else if(any.typ=="name") nv = any.val;
					else throw "unknown var type: "+any.typ;
					for(var i=0; i<nv.length; i++) str.val[i]=nv.charCodeAt(i);
				}
				else if(op=="cvx") {
					var o = os.pop(), no;
					if     (o.typ=="array") no = {typ:"procedure",val:o.val};
					else if(o.typ=="name" ) no = {typ:"name"     , val:o.val.slice(1)};
					else if(o.typ=="string") {
						//var str = FromPS.readStr(o.val);
						//console.log(str);  throw "e";
						no = {typ:"file", val:{off:0, buff:new Uint8Array(o.val)}};
					}
					else {  console.log(o);  throw o.typ;  }
					//if(o.typ=="array") o.typ="procedure";
					//else if(o.typ=="name" && o.val.charAt(0)=="/") o = {typ:"name",val:o.val.slice(1)};
					//else {  console.log(o);  throw "e";  }
					os.push(no);
				}
				else if(op=="cvlit") {  var obj = os.pop();  if(obj.typ=="procedure") os.push({typ:"array",val:obj.val});  else os.push(obj);  }
				else if(op=="cvn") {
					os.push({typ:"name",val:FromPS.readStr(os.pop().val)});
				}
				else if(["add","sub","mul","div","idiv","bitshift","mod","exp","atan"].indexOf(op)!=-1) {
					var o1 = os.pop(), o0 = os.pop(), v0=o0.val, v1=o1.val, out = 0, otp = "";
					if(op=="add" || op=="sub" || op=="mul") otp = (o0.typ=="real" || o1.typ=="real") ? "real" : "integer";
					else if(op=="div" || op=="atan" || op=="exp") otp = "real";
					else if(op=="mod" || op=="idiv" || op=="bitshift") otp = "integer";
					
					if(o0.typ=="real") {  f32[0]=v0;  v0=f32[0];  }
					if(o1.typ=="real") {  f32[0]=v1;  v1=f32[0];  }
					
					if(op=="add") out = v0+v1;
					if(op=="sub") out = v0-v1;
					if(op=="mul") out = v0*v1;
					if(op=="div") out = v0/v1;
					if(op=="idiv")out = ~~(v0/v1);
					if(op=="bitshift") out = v1>0 ? (v0<<v1) : (v0>>>(-v1));
					if(op=="mod") out = v0%v1;
					if(op=="exp") out = Math.pow(v0, v1);
					if(op=="atan")out = Math.atan2(v0, v1)*180/Math.PI;
					
					if(otp=="real") {  f32[0]=out;  out=f32[0];  }
					os.push({ typ:otp, val:out });
				}
				else if(["neg","abs","floor","ceiling","round","truncate","sqrt","ln","sin","cos"].indexOf(op)!=-1) {
					var o0 = os.pop(), v0=o0.val, out = 0, otp = "";
					if(op=="neg" || op=="abs" || op=="truncate" || op=="floor" || op=="ceiling" || op=="round") otp=o0.typ;
					else if(op=="sqrt" || op=="sin" || op=="cos" || op=="ln") otp="real";
					
					if(o0.typ=="real") {  f32[0]=v0;  v0=f32[0];  }
					
					if(op=="neg" ) out = -v0;
					if(op=="abs" ) out = Math.abs(v0);
					if(op=="floor")out = Math.floor(v0);
					if(op=="ceiling")out = Math.ceil(v0);
					if(op=="round")out = Math.round(v0);
					if(op=="truncate") out = Math.trunc(v0);
					if(op=="sqrt") out = Math.sqrt(v0);
					if(op=="ln"  ) out = Math.log(v0);
					if(op=="sin" ) out = Math.sin(v0*Math.PI/180);
					if(op=="cos" ) out = Math.cos(v0*Math.PI/180);
					
					if(op=="ln" && v0<=0)  throw "e";
					
					if(otp=="real") {  f32[0]=out;  out=f32[0];  }
					
					os.push({typ:otp, val:out});
				}
				else if(["eq","ge","gt","le","lt","ne"].indexOf(op)!=-1) {
					var o1=os.pop(), o0=os.pop(), t0=o0.typ, t1=o1.typ, v0=o0.val, v1=o1.val, out=false;
					//if(o0.typ!=o1.typ) {  console.log(op,o0,o1);  throw "e";  }
					if(op=="eq" || op=="ne") {
						var eqt = o0.typ==o1.typ;
						if     ( eqt && ["integer","real","name","null","dict"].indexOf(t0)!=-1) out=v0==v1;
						else if((t0=="real"&&t1=="integer") || (t1=="real"&&t0=="integer")) out=v0==v1;
						else if(!eqt && (o0.typ=="null" || o1.typ=="null")) out=false;
						else if( eqt && o0.typ=="string") {
							if(v0.length!=v1.length) out=false;
							else {  out = true;  for(var i=0; i<v0.length; i++) if(v0[i]!=v1[i]) out=false;  }
							//console.log(op, v0, v1, out);
						}
						else {  console.log(op, o0,o1, o0.val==o1.val);  throw "e";  }
						
						if(op=="ne") out=!out;
					}
					else if(op=="ge") out=v0>=v1;
					else if(op=="gt") out=v0> v1;
					else if(op=="le") out=v0<=v1;
					else if(op=="lt") out=v0< v1;
					//if(op=="ne") out=v0!=v1;
					//if(op=="eq") console.log(out);
					os.push({typ:"boolean",val:out});
				}
				else if(["and","or"].indexOf(op)!=-1) {
					var b2 = os.pop(), b1 = os.pop(), v1=b1.val, v2 = b2.val, ints=(b1.typ=="integer"), out;
					if(op=="and") out = ints ? (v1&v2) : (v1&&v2);
					if(op=="or" ) out = ints ? (v1|v2) : (v1||v2);
					os.push({typ:ints?"integer":"boolean", val:out});
				}
				else if(op=="not") {
					var b=os.pop(), v=b.val, ints=b.typ=="integer";
					var out = ints ? (~v) : (!v);
					os.push({typ:ints?"integer":"boolean", val:out});
				}
				else if(op=="if") {
					var proc = os.pop(), cnd = os.pop().val;  //console.log(cnd);
					if(cnd) FromPS.addProc(proc, es);//FromPS.callProcedure(proc, file, os, ds, es, gs, gst, genv);
				}
				else if(op=="ifelse") {
					var proc2 = os.pop(), proc1 = os.pop(), cnd = os.pop().val;
					FromPS.addProc(cnd?proc1:proc2, es);
				}
				else if(op=="exec" || op=="stopped") {  var obj = os.pop();  
					if(op=="stopped") FromPS.addProc({typ:"procedure",val:[{typ:"boolean", val:false}]},es);  //os.push({typ:"boolean", val:false});
					
					if(obj.typ=="procedure") FromPS.addProc(obj, es);  
					else if(obj.typ=="name" || obj.typ=="operator" || obj.typ=="integer" || obj.typ=="real" || obj.typ=="array") 
						FromPS.addProc({typ:"procedure",val:[obj]},es);
					else {  console.log(obj);  throw "unknown executable type: "+obj.typ;  }
				}
				else if(op=="stop") {  var tpr = es[es.length-1];  if(tpr.typ=="procedure" && tpr.off!=0) es.pop();  }
				else if(op=="dup" ) {  var v=os.pop();  os.push(v,v);  }
				else if(op=="exch") {  os.push(os.pop(), os.pop());  }
				else if(op=="copy") {
					var n = os.pop();  //console.log(n);
					if(n.typ=="integer") {  var els=[];  for(var i=0; i<n.val; i++) els[n.val-1-i] = os.pop();  
						for(var i=0; i<n.val; i++) os.push(els[i]);  
						for(var i=0; i<n.val; i++) os.push(els[i]);    }
					else if(n.typ=="array") {
						var m = os.pop().val;
						for(var i=0; i<m.length; i++) {  n.val[i]=m[i];  if(m[i].val==null) {  console.log(ds);  throw "e"; }  }
						os.push(n);
					}
					else if(n.typ=="dict") {
						var m = os.pop().val;
						for(var prp in m) {  n.val[prp]=m[prp];  }
						os.push(n);
					}
					else throw "e";
				}
				else if(op=="roll") {  var j=os.pop().val, n = os.pop().val;
					var els = [];  for(var i=0; i<n; i++) els.push(os.pop());  els.reverse();
					j = (n+j)%n;
					for(var i=0; i<j; i++) els.unshift(els.pop());
					for(var i=0; i<n; i++) os.push(els[i]);
				}
				else if(op=="index") {  var n=os.pop().val;  os.push(os[os.length-1-n]);  }
				else if(op=="anchorsearch") {
					var sk = os.pop(), st = os.pop();
					var sek=sk.val, str=st.val;
					var occ = true;
					if(sek.length<=str.length) {
						for(var i=0; i<sek.length; i++) if(sek[i]!=str[i]) occ=false;
					}
					else occ=false;
					if(occ) os.push({typ:"string",val:str.slice(sek.length)}, sk);
					else    os.push(st);
					os.push({typ:"boolean",val:occ});
				}
				else if(op=="transform" || op=="itransform" || op=="dtransform" || op=="idtransform") {
					var m = os.pop(), y=0, x=0;  //console.log(m);
					if(m.typ=="array") { m = FromPS.readArr(m.val);  y = os.pop().val;  }
					else               { y = m.val;  m = gst.ctm.slice(0);  }
					if(op=="itransform"||op=="idtransform") {  UDOC.M.invert(m);  }
					x = os.pop().val;
					if(op.endsWith("dtransform")) {  m[4]=0;  m[5]=0;  }
					var np = UDOC.M.multPoint(m, [x,y]);
					//if(isNaN(np[0])) {  console.log(m,gst.ctm.slice(0),x,y);  throw "e";  }
					os.push({typ:"real",val:np[0]},{typ:"real",val:np[1]});
				}
				else if(op=="pop" || op=="srand" || op=="==" ) {  os.pop();  }
				else if(op=="rand") {  os.push({typ:"integer",val:Math.floor(Math.random()*0x7fffffff)});  }
				else if(op=="put" ) {  
					var val=os.pop(), o=os.pop(), obj=os.pop(), otp=obj.typ;  //console.log(obj,o,val);  //throw "e";
					if     (otp=="array" ) {
						if(o.typ!="integer") throw "e";
						obj.val[o.val] = val;
					}
					else if(otp=="dict"  ) {
						var nn = FromPS.getDKey(o);
						//if(nn=="indexed_colorspace_dict") {  console.log(obj, val);  throw "e";  }
						obj.val[nn]=val;
					}
					else if(otp=="string") obj.val[o.val] = val.val;
					else throw otp+" e";
					//.val.slice(1), obj=os.pop();  obj.val[key]=obj.typ=="string" ? val.val : val;  
				}
				else if(op=="get" ) {  
					var o=os.pop(), obj=os.pop(), otp=obj.typ;   //console.log(o, obj);
					if     (otp=="string") os.push({typ:"integer",val:obj.val[o.val]});
					else if(otp=="array" ) {  var nv=obj.val[o.val];  if(nv==null) throw "e";  os.push(nv);  }
					else if(otp=="dict"  ) {var k=FromPS.getDKey(o), v =obj.val[k];  if(v==null) {  throw "e";  } else  os.push(v);  }
					else throw "getting from unknown type "+  obj.typ;  //os.push(obj.val[key]);  
				}
				else if(op=="load") {  var key=os.pop().val.slice(1), val = FromPS.getFromStacks(key, ds);  
					if(val==null) {  console.log(key, ds);  throw "e";  }  os.push(val);  }
				else if(op=="where"){  var key=os.pop().val.slice(1), dct=FromPS.where(key,ds);   //console.log(dct);
					if(dct!=null) os.push({typ:"dict",val:dct,maxl:1000});  os.push({typ:"boolean",val:dct!=null});  }
				else if(op=="store"){
					var val=os.pop(), key=os.pop().val.slice(1), dct=FromPS.where(key,ds);   //console.log(dct, key);  throw "e";
					if(dct==null) dct=ds[ds.length-1];  dct[key]=val;  }
				else if(op=="repeat" ) {
					var proc=os.pop(), intg=os.pop().val;
					es.push({typ:"name",val:op+"---", ctx:{ proc:proc, cur:0, cnt:intg }});
				}
				else if(op=="repeat---") {
					var ctx = tok.ctx;
					if(ctx.cur<ctx.cnt) {  es.push(tok);  FromPS.addProc(ctx.proc, es);  ctx.cur++;  }
				}
				else if(op=="for" ) {
					var proc=os.pop(), liV=os.pop(), icV=os.pop(), itV=os.pop();
					es.push({typ:"name",val:op+"---", ctx:{  proc:proc, isInt:(itV.typ=="integer" && icV.typ=="integer"), 
								init:itV.val, inc:icV.val, limit:liV.val  }});
				}
				else if(op=="for---") {
					var ctx = tok.ctx;
					if(ctx.isInt) {
						if((ctx.inc>0 && ctx.init<=ctx.limit) || (ctx.inc<0 && ctx.init>=ctx.limit)) {
							es.push(tok);  FromPS.addProc(ctx.proc, es);  
							os.push({typ:"integer",val:ctx.init});  ctx.init+=ctx.inc;
						}
					}
					else {
						var lf = new Float32Array(1);
						lf[0]=ctx.limit;  ctx.limit=lf[0];
						lf[0]=ctx.inc  ;  ctx.inc  =lf[0];
						lf[0]=ctx.init;
						if((ctx.inc>0 && lf[0]<=ctx.limit)  ||  (ctx.inc<0 && lf[0]>=ctx.limit)) { 
							es.push(tok);  FromPS.addProc(ctx.proc, es);  
							os.push({typ:"real",val:lf[0]});  lf[0]+=ctx.inc;  ctx.init=lf[0];
						}
					}
				}
				else if(op=="loop" ) {
					//throw "e";
					var proc=os.pop();
					//console.log("pushing loop to stack");
					es.push({typ:"name",val:op+"---", ctx:{ proc:proc }});
				}
				else if(op=="loop---") {
					var ctx = tok.ctx;
					//console.log("pushing loop to stack");
					es.push(tok);
					FromPS.addProc(ctx.proc, es);
				}
				else if(op=="pathforall") {
					var cl = os.pop(), cr=os.pop(), li=os.pop(), mv=os.pop();
					//console.log(mv,li,cr,cl);
					/*
					var cmds=gst.pth.cmds, crds = gst.pth.crds, co=0;
					//console.log(cmds, crds);
					for(var i=0; i<cmds.length; i++) {
						var cmd = cmds[i], pr=null, cn=0;
						if     (cmd=="M") {  pr=mv;  cn=2;  }
						else if(cmd=="L") {  pr=li;  cn=2;  }
						else if(cmd=="C") {  pr=cr;  cn=6;  }
						else if(cmd=="Z") {  pr=cl;  cn=0;  }
						else throw "e";
						FromPS.addProc(pr,es);
						for(var j=0; j<cn; j++) os.push({typ:"real",val:crds[co+j]});
						co+=cn;
					}  //*/
				}
				else if(op=="forall") {
					var proc = os.pop(), obj = os.pop();
					var ctx = [proc,obj,0];  //console.log(JSON.parse(JSON.stringify(ctx)));
					es.push({typ:"name",val:op+"---",ctx:ctx});
				}
				else if(op=="forall---") {
					var ctx=tok.ctx, proc=ctx[0],obj=ctx[1],i=ctx[2];
					if(obj.typ=="dict") {
						var keys = Object.keys(obj.val); 
						if(i<keys.length) {
							es.push(tok);  FromPS.addProc(proc, es);  
							os.push({typ:"name",val:"/"+keys[i]});
							var nv = obj.val[keys[i]];
							if(nv==null) throw "e";
							os.push(nv==null?{typ:"null",val:null}:nv);  ctx[2]++;
							//console.log(i,keys[i],obj.val[keys[i]]);
							//console.log(keys[i], obj.val[keys[i]]);
							//for(var p in obj.val) {  FromPS.addProcedure(proc.val, file);  FromPS.addProcedure([obj.val[p]], file);  }
						}
					}
					else if(obj.typ=="procedure" || obj.typ=="array") {
						//console.log(op,ctx);
						if(i<obj.val.length) {
							es.push(tok);  FromPS.addProc(proc, es);  
							var cvl = obj.val[i];  //if(cvl==null){  console.log(obj);  throw "e";  }
							os.push(cvl==null?{typ:"null",val:null}:cvl);  ctx[2]++;
						}
						//for(var i=obj.val.length-1; i>=0; i--) {  FromPS.addProcedure(proc.val, file);  FromPS.addProcedure([obj.val[i]], file);  }
					}
					else {  console.log(proc, obj);  throw "forall: unknown type: "+obj.typ;  }
				}
				else if(op=="exit") {
					var i = es.length-1;
					while(i!=0 && (es[i].typ!="name" || !es[i].val.endsWith("---"))) i--;
					if(i!=0) while(es.length>i) es.pop();
					//console.log(es,i);  throw "e";
				}
				else if(op=="bind") {  
				
					/* var v=os.pop(), prc=v.val;  os.push(v); 
					for(var i=0; i<prc.length; i++){
						var nop = FromPS.getOperator(prc[i].val, ds);	 
						//if(nop!=null) prc[i]=nop;  // missing !!!
					}*/
				}
				else if(op=="xcheck") {
					var obj = os.pop(), typ=obj.typ;
					os.push({typ:"boolean",val:(typ=="procedure")});
					//console.log(obj);  throw "e";
				}
				else if(op=="status"  ) {  var str = os.pop();  os.push({typ:"boolean",val:false});  }
				else if(op=="cachestatus") {  for(var i=0; i<7; i++) os.push({typ:"integer",val:5000});  }
				else if(op=="setcachelimit") {  os.pop();  }
				else if(op=="type"    ) {
					var o = os.pop();
					var tps = {"name":"nametype","dict":"dicttype","boolean":"booleantype","procedure":"operatortype","string":"stringtype","null":"nulltype",
								"integer":"integertype","array":"arraytype","operator":"operatortype","real":"realtype"};  
					if(tps[o.typ]==null) {  console.log(o);  throw o.typ;  }
					os.push({typ:"name",val:"/"+tps[o.typ]})
				}
				else if(op=="save"    ) {  os.push({typ:"state",val:JSON.parse(JSON.stringify(gst))});   }
				else if(op=="restore" ) {  gst = env.gst = os.pop().val;  }
				else if(op=="clipsave"    ) {  gst.cpstack.push(JSON.parse(JSON.stringify(gst.cpth)));   }
				else if(op=="cliprestore" ) {  gst.cpath = gst.cpstack.pop();  }
				else if(op=="gsave"   ) {  gs.push(JSON.parse(JSON.stringify(gst)));  }
				else if(op=="grestore") {  if(gs.length!=0) gst = env.gst = gs.pop();  else gst=UDOC.getState();  }
				else if(op=="grestoreall") {  while(gs.length!=0) gst = env.gst = gs.pop();  }
				else if(op=="usertime" || op=="realtime") os.push({typ:"integer",val:(op=="usertime"?(Date.now()-otime):Date.now())});
				else if(op=="flush" || op=="readonly" || op=="executeonly") {}
				else if(op=="flushfile") {
					FromPS.GetFile(os.pop());  //console.log(fle._filtEnd, fle.val.off);
				}
				else if(op=="filter") {
					var ftyp = os.pop().val;
 
					var nflt;
					if(ftyp=="/SubFileDecode"){
						var str = os.pop();  if(str.typ!="string") throw "e";
						var cnt = os.pop().val;
						str = str.val;
						nflt = [ftyp,str,cnt]
					}
					else nflt = [ftyp];
					
					var sfil = os.pop();
					//var cfl = sfil._flt;  if(cfl==null) cfl=[]; 
					//cfl.push(nflt);
					
					os.push({typ:"file",val:{buff:new Uint8Array(),off:0},_flt:nflt,_src:sfil});
				}
				else if(op=="begincmap" || op=="endcmap") {  /*console.log(op);  occurs in PDF in CMap generators*/  }
				else if(op=="begincodespacerange"||op=="beginbfrange"||op=="beginbfchar") {  env.cmnum = os.pop().val;  }
				else if(op=="endcodespacerange"  ||op=="endbfrange"  ||op=="endbfchar"  ) {
					var cl = (op=="endbfrange"?3:2);
					var pn = op.slice(3), dct = ds[ds.length-1], bpc=0;
					if(dct[pn]==null) dct[pn]=[];
					for(var i=0; i<env.cmnum; i++) {
						var vs=[];  
						for(var j=cl-1; j>=0; j--) {  
							var ar=os.pop(), av=ar.val, nv;
							if(ar.typ=="string") {  nv = FromPS.strToInt(av);  if(j==0) bpc=av.length;  }
							else {  nv = [];  for(var k=0; k<av.length; k++) nv.push(FromPS.strToInt(av[k].val));  }
							vs[j]=nv;
						}
						dct[pn] = dct[pn].concat(vs);
					}
					if(op!="endcodespacerange") dct["bpc"] = bpc; // bytes per input character
				}
				else if(Oprs) Oprs(op, os, ds, es, gs, env, genv);
				else {  console.log(val, op);  console.log(ds, os);  throw "e";  }
			}
			else throw obj.typ;
		}
		return true;
	}
	FromPS.strToInt = function(str)  {  var v=0;  for(var i=0; i<str.length; i++) v = (v<<8)|str[i];  return v;  }
	FromPS.getDKey = function(o) {  if(o.typ=="name") return o.val.slice(1);  
									if(o.typ=="string") return FromPS.readStr(o.val);
									return o.val;  }
	
	FromPS.GetFile = function(cf) {  
		if(cf._flt==null || cf.val.off<cf.val.buff.length) return cf;
		
		FromPS.GetFile(cf._src);
		var fl = cf._src.val;
		var f=cf._flt, ftyp=f[0];  //console.log(ftyp, fl);
		var nb;
		if     (ftyp=="/ASCII85Decode"  ) nb = FromPS.F.ASCII85Decode(fl);
		else if(ftyp=="/RunLengthDecode") nb = FromPS.F.RunLengthDecode(fl);
		else if(ftyp=="/FlateDecode"    ) nb = FromPS.F.FlateDecode(fl);
		else if(ftyp=="/LZWDecode"      ) nb = FromPS.F.LZWDecode(fl);
		else if(ftyp=="/SubFileDecode"  ) {
			var str = f[1], cnt = f[2];
			
			var off = fl.off, occ=0; // buff
			while(off<fl.buff.length) {
				var i = 0;
				while(i<str.length && fl.buff[off+i]==str[i]) i++;
				if(i==str.length) {
					if(occ==cnt) break;
					occ++;
				}
				off++;
			}
			nb = fl.buff.slice(fl.off, off);
			fl.off = off;
		}
		else throw ftyp;
		
		cf.val = {buff:nb, off:0};
		
		return cf;
	}

	FromPS.checkPageStarted = function(env,genv) {  if(!env.pgOpen) {  genv.StartPage(env.bb[0], env.bb[1], env.bb[2], env.bb[3]);  env.pgOpen = true;   }  }
	
	FromPS.getPSShadingFill = function(sh, mat) {		
		function toNorm(obj) {
			var out, typ=obj.typ, val=obj.val;
			if(typ=="dict") {
				out = {};
				for(var p in val) out["/"+p]=toNorm(val[p]);
			}
			else if(typ=="array") {
				out = [];
				for(var i=0; i<val.length; i++) out.push(toNorm(val[i]));
			}
			else if(typ=="string") {
				out = "";
				for(var i=0; i<val.length; i++) out+=String.fromCharCode(val[i]);
			}
			else if(["boolean","integer","real","name"].indexOf(typ)!=-1) out = val;
			else if(typ=="procedure") {  
				var prc = "";
				for(var i=0; i<val.length; i++) prc+= val[i].val+" ";
				prc = "{ "+prc+"}"; 
				var stm = new Uint8Array(prc.length);
				for(var i=0; i<prc.length; i++) stm[i] = prc.charCodeAt(i);
				out = {
					"/FunctionType":4,
					"/Domain":[0,1],
					"/Range" :[0, 1, 0, 1, 0, 1, 0, 1],
					"/Length": prc.length,
					"stream" : stm
				}
			}
			else {  console.log(obj);  throw "e";  }
			return out;
		}
		//console.log(sh);
		var nsh = toNorm(sh);
		return FromPS.getShadingFill(nsh, mat);
	}
	
	FromPS.F = {
		HexDecode : function(file) {
			var arr = [];
			FromPS.readHex(file, 1e9, arr);
			return new Uint8Array(arr);
		},
		ASCII85Decode : function(file) {
			//console.log(file, file.off);
			//console.log(PUtils.readASCII(file.buff, file.off, 160));
			var pws = [85*85*85*85, 85*85*85, 85*85, 85, 1];
			var arr = [], i=0, tc=0, off=file.off;
			while(true) {
				if(off>=file.buff.length)  throw "e";
				var cc = file.buff[off];  off++;
				if(FromPS.isWhite(cc))  continue;
				if(cc==126) {
					if(i!=0) {
						if(i==3) {  arr.push(((tc>>>24)&255));                   }
						if(i==4) {  arr.push(((tc>>>24)&255), ((tc>>>16)&255));    }
						var lb = (5-i)<<3;  // i=2: 24, i=3: 16 ...
						var nn=((tc>>>lb)&255);  tc=(tc&((1<<lb)-1));  if(tc!=0)nn++;  arr.push(nn);
					}
					file.off=off+1;  //console.log(arr.join(","));  
					//console.log(arr.length);
					return new Uint8Array(arr);  
				}
				if(cc==122) {  arr.push(0,0,0,0);  continue;  }
				if(cc<33 || 84+33<cc) {  console.log(cc, String.fromCharCode(cc), off-file.off);  throw "e";  }
				tc += (cc-33)*pws[i];  i++;
				if(i==5) {
					arr.push((tc>>>24)&255);  arr.push((tc>>>16)&255);
					arr.push((tc>>> 8)&255);  arr.push((tc>>> 0)&255);
					i=0;  tc=0;
				}
			}
		},
		RunLengthDecode : function(file) {
			var arr = [], off=file.off;
			while(true) {
				if(off>=file.buff.length)  {  console.log(arr);  throw "e";  }
				var cc = file.buff[off];  off++;
				if(cc==128) {  file.off=off;  return new Uint8Array(arr);  }
				if(cc< 128) {  for(var i=0; i<cc+1  ; i++) arr.push(file.buff[off+i]);  off+=cc+1;  }
				else        {  for(var i=0; i<257-cc; i++) arr.push(file.buff[off]  );  off++;      }
			}
		},
		FlateDecode : function(file) {
			//console.log("FlateDecode", file);
			//if(file.buff.length==26770)  {  console.log(FromPS.B.readASCII(file.buff, 0, file.buff.length));  throw "e";  }
			//var b = file.buff, ub = new Uint8Array(b.buffer,file.off,b.length);  //console.log(ub);
			// pako.inflate has a bug for "John Coes Proposal (1).pdf"
			// UZIP has a bug for "Vzor(34).pdf"
			var b = file.buff, ub = new Uint8Array(b.buffer,file.off+2,b.length-2);  //console.log(ub);
			var bytes = pako["inflateRaw"](ub);
			return bytes;
		},
		LZWDecode : function(file) {
			var nb = new Uint8Array((file.buff.length-file.off)*20); 
			var noff = UTIF.decode._decodeLZW(file.buff, file.off, nb, 0);
			return nb.slice(0,noff);
		},
		_myLZW : function(){var x={},y=function(L,F,i,W,_){for(var a=0;a<_;a+=4){i[W+a]=L[F+a];
		i[W+a+1]=L[F+a+1];i[W+a+2]=L[F+a+2];i[W+a+3]=L[F+a+3]}},c=function(L,F,i,W){if(!x.c){var _=new Uint32Array(65535),a=new Uint16Array(65535),Z=new Uint8Array(2e6);
		for(var f=0;f<256;f++){Z[f<<2]=f;_[f]=f<<2;a[f]=1}x.c=[_,a,Z]}var o=x.c[0],z=x.c[1],Z=x.c[2],h=258,n=258<<2,k=9,C=F<<3,m=256,B=257,p=0,O=0,K=0;
		while(!0){p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;if(O==m){k=9;
		h=258;n=258<<2;p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;
		i[W]=O;W++}else if(O<h){var J=o[O],q=z[O];y(Z,J,i,W,q);W+=q;if(K>=h){o[h]=n;Z[o[h]]=J[0];z[h]=1;n=n+1+3&~3;
		h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[J];l++;z[h]=l;h++;n=n+l+3&~3}if(h+1==1<<k)k++}else{if(K>=h){o[h]=n;
		z[h]=0;h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[n];l++;z[h]=l;h++;y(Z,n,i,W,l);W+=l;n=n+l+3&~3}if(h+1==1<<k)k++}K=O}return W};
		return c}()
	}
	
	FromPS.B = {
		readUshort : function(buff,p)  {  return (buff[p]<< 8) | buff[p+1];  },
		readUint   : function(buff,p)  {  return (buff[p]*(256*256*256)) + ((buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3]);  },
		readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    }
	}
	
	FromPS.nrm = function(v) {  return Math.max(0,Math.min(1,v));  }
	FromPS.makeArr = function(a,typ) {  var na=[];  for(var i=0; i<a.length; i++) na.push({typ:typ,val:a[i]});  return na;  }
	FromPS.readArr = function(a    ) {  var na=[];  for(var i=0; i<a.length; i++) na.push(a[i].val          );  return na;  }
	FromPS.makeStr = function(s    ) {  var a =[];  for(var i=0; i<s.length; i++) a.push(s.charCodeAt(i))     ; return a;   }
	FromPS.readStr = function(a    ) {  var s ="";  for(var i=0; i<a.length; i++) s+=String.fromCharCode(a[i]); return s;   }

	FromPS.getFromStacks = function(name, ds)
	{
		//console.log(ds);
		var di = ds.length-1;
		while(di>=0) {  if(ds[di][name]!=null) return ds[di][name];  di--;  }
		return null;
	}
	FromPS.where = function(name, ds)
	{
		var di = ds.length-1;
		while(di>=0) {  if(ds[di][name]!=null) return ds[di]      ;  di--;  }
		return null;
	}
	
	
	
	
	
	
	
	FromPS.skipWhite = function(file) {
		var i = file.off, buff=file.buff, isWhite = FromPS.isWhite;
		
		while(isWhite(buff[i]) || buff[i]==37) {
			while(isWhite(buff[i])) i++;	// not the first whitespace
			if(buff[i]==37) {  while(i<buff.length && !FromPS.isEOL(buff[i])) i++;  i++;  }	// comments
		}
		file.off = i;
	}
	
	
	
	FromPS.getToken = function(es, ds) {
		if(es.length==0) return null;
		var src = es[es.length-1];
		if(src.typ=="procedure") {
			var tok = src.val[src.off];  src.off++;
			if(src.off==src.val.length) es.pop();
			return tok;
		}
		if(src.typ=="name") {  es.pop();  return src;  }
		
		var ftok = FromPS.getFToken(src.val, ds);
		if(ftok==null) {  es.pop();  if(es.length!=0) ftok = FromPS.getFToken(es[es.length-1].val, ds);  }
		return ftok;
	}
	
	FromPS.getFToken = function(file, ds) {
		FromPS.skipWhite(file);
		
		var isWhite = FromPS.isWhite, isSpecl = FromPS.isSpecl;
		var i = file.off, buff=file.buff, tok = null;
		if(i>=buff.length) return null;
		
		var cc = buff[i], ch = String.fromCharCode(cc);  i++;
			
		if(ch=="(") {  
			var dpth=0, end=i;
			while(!(buff[end]==41 && dpth==0)) {  if(buff[end]==40) dpth++;  if(buff[end]==41) dpth--;  if(buff[end]==92) end++;   end++;  }
			var str = []; 
			for(var j=0; j<end-i; j++) str.push(buff[i+j]);
			i = end+1;
			str = FromPS.getString(str);
			tok = {typ:"string", val:str};
		}
		else if(ch=="{" || ch=="}" || ch=="[" || ch=="]") {  tok = {typ:"name", val:ch};  }
		else if((ch=="<" && buff[i]==60) || (ch==">" && buff[i]==62)) {  tok = {typ:"name", val:ch=="<" ? "<<" : ">>"};  i++;  }
		else if(ch=="<") {
			var str;
			if(buff[i]=="~".charCodeAt(0)) {
				file.off = i+1;
				var bstr = FromPS.F.ASCII85Decode(file);
				str = [];  for(var j=0; j<bstr.length; j++) str.push(bstr[j]);
				i = file.off;
				//console.log(str);  throw "e";
			}
			else {
				var end = i;  while(buff[end]!=62) end++;  
				var str = [];
				FromPS.readHex({buff:buff,off:i},1e9, str);
				i = end+1;
			}
			tok = {typ:"string",val:str};
		}
		else {
			var end = i;
			while(end<buff.length && !isWhite(buff[end]) && (!isSpecl(buff[end]) || (buff[end]==47&&buff[end-1]==47&&end==i) )) end++;  // read two slashes
			var name = FromPS.B.readASCII(buff, i-1, end-i+1);
			i = end;
			var num = parseFloat(name);
			if(false) {}
			else if(name=="true" || name=="false") tok = {typ:"boolean", val:name=="true"};
			else if(!isNaN(num)) {
				var f32 = new Float32Array(1);  f32[0]=num;  num=f32[0];
				tok = {typ:name.indexOf(".")==-1?"integer":"real", val:num};
			}
			else {  
				if(name.slice(0,2)=="//") {
					var nn = name.slice(2);
					var sbs = FromPS.getFromStacks(nn, ds);
					if(sbs!=null) tok = sbs;
					else tok = {typ:"name", val:name};
				}
				else tok = {typ:"name", val:name};    
			}
		}
		file.off = i;
		return tok;
	}
	// ( ) < >     [ ] { }  %  /
	FromPS.isSpecl = function(cc) {  return [ 40,41, 60,62,   91,93, 123,125,  37,  47   ].indexOf(cc)!=-1;  }
	FromPS.isWhite = function(cc) {  return cc==0 || cc==9 || cc==10 || cc==12 || cc==13 || cc==32;  }
	FromPS.isEOL   = function(cc) {  return cc==10 || cc==13;  }
	
	FromPS.getString = function(str) {  
		var s=[];  
		var m0 = ["n" , "r" , "t" , "b" , "f" , "\\", "(", ")", " ", "/"];
		var m1 = ["\n", "\r", "\t", "", "", "\\", "(", ")", " ", "/"];
		
		for(var i=0; i<str.length; i++) {
			var cc = str[i], ch = String.fromCharCode(cc);
			if(ch=="\\") {
				var nx = String.fromCharCode(str[i+1]);  i++;
				if(nx=="\r" || nx=="\n") continue;
				var idx = m0.indexOf(nx);
				if(idx!=-1) s.push(m1[idx].charCodeAt(0));
				else {
					var cod = nx + String.fromCharCode(str[i+1]) + String.fromCharCode(str[i+2]);  i+=2;
					s.push(parseInt(cod,8));
				}
			}
			else s.push(cc);  
		}
		return s;  
	}
	FromPS.makeString = function(arr) {
		var m0 = ["n" , "r" , "t" , "b" , "f" , "\\", "(", ")"];
		var m1 = ["\n", "\r", "\t", "", "", "\\", "(", ")"];
		var out = [];
		for(var i=0; i<arr.length; i++) {
			var b = arr[i];
			var mi = m1.indexOf(String.fromCharCode(b));
			if(mi==-1) out.push(b);
			else out.push(92, m0[mi].charCodeAt(0));
		}
		return out;
	}
	FromPS.readHex = function(fl, l, val) {
		var i=0, j=-1, o=fl.off;
		while(i!=l) {
			var cc = fl.buff[o];  o++;
			var ci=0;
			if(47<cc && cc<58) ci=cc-48;
			else if(96<cc && cc<103) ci=10+cc-97;
			else if(64<cc && cc<71 ) ci=10+cc-65;
			else if(cc==62) break;
			else if(FromPS.isWhite(cc)) continue;
			else throw "e";
			if(j==-1) j=ci;
			else {  val[i]=(j<<4)|ci;  j=-1;  i++;  }
		}
		fl.off=o;
	}
	
	
	FromPS.getShadingFill = function(sh, mat)
	{
		//console.log(sh);
		var styp = sh["/ShadingType"], cs = sh["/ColorSpace"], ext = sh["/Extend"], crds = sh["/Coords"]?sh["/Coords"].slice(0):null;
		if(ext==null) ext=[false,false]; 
		var ftyp = "";
		if     (styp==2) ftyp="lin";
		else if(styp==3) ftyp="rad";
		else {  console.log("Unknown shading type", styp);  return;  }
		
		var fun = sh["/Function"], grad;
		if(fun instanceof Array) {
			var n = fun.length, cc;
			for(var i=0; i<n; i++) {
				var cg = FromPS.getGrad(fun[i], "/DeviceGray");
				if(i==0) cc = cg;
				else {
					var stps = cc.length;
					for(var j=0; j<stps; j++) cc[j][1][i] = cg[j][1][0];
				}
			}
			if(cs=="/DeviceCMYK") for(var i=0; i<cc.length; i++) cc[i][1] = UDOC.C.cmykToRgb(cc[i][1]);
			grad = cc;
		}
		else grad = FromPS.getGrad(fun, cs);
		
		if(ftyp=="rad" && crds[2]>crds[5]) {
			crds = crds.slice(3).concat(crds.slice(0,3))
			ext.reverse();  grad.reverse();
			for(var i=0; i<grad.length; i++) grad[i][0]=1-grad[i][0];
		}
		
		if(!ext[0] && ftyp!="rad") {  var stp=grad[0            ];  stp[0]+=0.002;  grad.unshift([0.001,stp[1].slice(),0]);  }
		if(!ext[1]               ) {  var stp=grad[grad.length-1];  stp[0]-=0.002;  grad.push   ([0,999,stp[1].slice(),0]);  }
		
		var out = {typ:ftyp, mat:mat, grad:grad, crds:crds};  //console.log(out);
		return out;
	}
	
	FromPS.getGrad = function(fn, cs) {
		//console.log(fn,cs);
		var F = FromPS._normColor;
		var fs = fn["/Functions"], ft = fn["/FunctionType"], bs = fn["/Bounds"], enc = fn["/Encode"];
		
		var out;
		if(ft==0) {
			out = [], n=Math.min(4, fn["/Size"][0]);
			for(var i=0; i<=n; i++) out.push( [(i)/n,F(fn,[(i)/n], cs)] );
		}
		else if(ft==2) out = [   [0,F(fn,[0], cs)],  [1,F(fn,[1], cs)]   ];
		// Stitching function type 3
		else if(ft==3) {
			var zero = 0;
			out = [];
			if(bs.length==0 || bs[0]>0) out.push([0, F(fs[0], [zero], cs)] );
			for(var i=0; i<bs.length; i++)  out.push([bs[i], F(fs[i],[1-zero], cs)]);
			if(bs.length==0 || bs[bs.length-1]<1) out.push([1, F(fs[fs.length-1], [1-zero], cs)]);
		}
		else if(ft==4) {
			out = [];
			for(var i=0; i<5; i++) out.push([i/5, F(fn, [i/5], cs)]);
		}
		//if(!ext[0]) {  out[0][0]+=0.01;  out.unshift([0,[0,0,0],0]);  }
		//if(!ext[0]) {  out[0][0]+=0.0001;  out.unshift([0,[0,0,0],0]);  }
		//console.log(fn, out);
		return out;
	}
	
	FromPS._normColor = function(fn, vls, cs) {
		//console.log(cs);
		var CMYK = "/DeviceCMYK", RGB="/DeviceRGB";
		var tcs;
		//console.log(fn, vls, cs);
		var clr = FromPS.Func(fn, vls);  //console.log(clr);
		if(cs[3] && cs[3]["/Length"]) {
			//console.log(cs[3]);  //throw "e";
			clr = FromPS.Func(cs[3], clr);
			//console.log(clr);
			if     (cs[2]==CMYK || clr.length==4) tcs = CMYK;
			else if(cs[2]==RGB) tcs = RGB;
			else if(cs[2] && cs[2][1] && cs[2][1]["/Alternate"] && cs[2][1]["/Alternate"][0]=="/Lab") tcs="/Lab";
			else {  console.log(clr, cs);  throw "unknown color profile";  }
			//console.log(clr);
		}
		else if(cs[0]=="/ICCBased" && cs[1]) {
			var N = cs[1]["/N"];
			if     (N==4) tcs = CMYK;
			else if(N==3) tcs = RGB;
			else throw N;
		}
		else if(cs[0]=="/Separation") {
			clr = FromPS._readSeparation(cs,clr[0]);  tcs = RGB;
		}
		else if(cs .length==1) tcs = cs[0];
		else if(cs[2]==CMYK ) tcs = CMYK;  // for shading.ps
		else tcs = cs;
		
		if     (tcs==RGB          ) clr = clr;
		else if(tcs==CMYK         ) clr = UDOC.C.cmykToRgb(clr);
		else if(tcs=="/DeviceGray") clr = [clr[0], clr[0], clr[0]];
		else if(tcs=="/Lab"       ) clr = UDOC.C.labToRgb(clr);
		else throw "Unknown color space "+tcs;
		
		//if(clr.length<3) {  console.log(clr.slice(0));  throw "e";  clr.push(1);  }
		//console.log(clr, cs);  throw "e";
		return clr;
	}
	FromPS._readSeparation = function(cs, val) {
		var cval = FromPS.Func(cs[3], [val]), c;
		if     (cs && cs[2]=="/DeviceCMYK") c = UDOC.C.cmykToRgb(cval); 
		else if(cs && cs[2]=="/DeviceGray") c = [cval[0],cval[0],cval[0]];
		else  c = UDOC.C.labToRgb(cval);
		return c;
	}
	
	FromPS.Func = function(f, vls)
	{
		//console.log(f, vls);
		var intp = FromPS.intp;
		var dom = f["/Domain"], rng = f["/Range"], typ = f["/FunctionType"], out = [];
		for(var i=0; i<vls.length; i++) vls[i]=Math.max(dom[2*i], Math.min(dom[2*i+1], vls[i]));
		if(typ==0) {
			var enc = f["/Encode"], sz = f["/Size"], dec = f["/Decode"], n = rng.length/2;
			if(enc==null) enc=[0,sz[0]-1];
			if(dec==null) dec=rng;//[0,sz[0]-1,0,sz[0]-1,0,sz[0]-1];
			
			for(var i=0; i<vls.length; i++) {
				var ei = intp(vls[i],dom[2*i],dom[2*i+1],enc[2*i],enc[2*i+1]);
				vls[i] = Math.max(0, Math.min(sz[i]-1, ei));
			}
			var ds = f["/DataSource"];  //console.log(ds.length, sz);
			for(var j=0; j<n; j++) {
				var x = Math.round(vls[0]), rj;
				if(ds) rj = ds.charCodeAt(n*x+j);
				else   rj = FromPS.GS(f)[n*x+j];
				rj = intp(rj, 0,255, dec[2*j],dec[2*j+1]);
				out.push(rj);
			}
		}
		else if(typ==2) {
			var c0=f["/C0"],c1=f["/C1"],N=f["/N"]
			var x = vls[0];
			for(var i=0; i<c0.length; i++) out[i] = c0[i] + Math.pow(x,N) * (c1[i]-c0[i]);
		}
		else if(typ==4) {
			var env = FromPS._getEnv([0,0,0,0]);  env.pgOpen = true;
			var gs = [];
			var os = [];	// operand stack
			var ds = FromPS._getDictStack([], {});
			var es = [];
			//console.log(FromPS.B.readASCII(FromPS.GS(f),0,FromPS.GS(f).length));
			es.push({  typ:"file", val: {  buff:FromPS.GS(f), off:0 }  });	// execution stack
			var repeat = true;
			while(repeat) repeat = FromPS.step(os, ds, es, gs, env, {}, FromPS.operator);
			
			var proc = os.pop();  proc.off=0;
			es.push(proc);
			for(var i=0; i<vls.length; i++) os.push({typ:"real",val:vls[i]});
			repeat = true;
			while(repeat) repeat = FromPS.step(os, ds, es, gs, env, {}, FromPS.operator);
			for(var i=0; i<os.length; i++) out.push(os[i].val);
		}
		
		if(rng) for(var i=0; i<out.length; i++) out[i]=Math.max(rng[2*i], Math.min(rng[2*i+1], out[i]));
		return out;
	}
	FromPS.intp = function(x,xmin,xmax,ymin,ymax) {  return ymin + (x-xmin) * (ymax-ymin)/(xmax-xmin);  }
	
	
	FromPS.GS = function(o) {
		if(o["stream"]==null) {
			var buff = o["buff"];  delete o["buff"];
			var flt = o["/Filter"], prm=o["/DecodeParms"];
			if(flt!=null) {
				var fla = (typeof flt == "string") ? [flt] : flt;
				var keepFlt = false;
				for(var i=0; i<fla.length; i++) {
					var cf = fla[i], fl = {buff:buff, off:0};
					if     (cf=="/FlateDecode"    ) {  buff = FromPS.F.FlateDecode    (fl);  }
					else if(cf=="/RunLengthDecode") {  buff = FromPS.F.RunLengthDecode(fl);  }
					else if(cf=="/LZWDecode"      ) {  buff = FromPS.F.LZWDecode      (fl);  }
					else if(cf=="/ASCIIHexDecode" ) {  buff = FromPS.F.HexDecode      (fl);  }
					else if(cf=="/ASCII85Decode" || cf=="/A85") {  buff = FromPS.F.ASCII85Decode  (fl);  }
					else if(cf=="/DCTDecode" || cf=="/CCITTFaxDecode" || cf=="/JPXDecode" || cf=="/JBIG2Decode") {  keepFlt = true;  }  // JPEG
					else {  console.log(cf, buff);  throw "e";  }
				}
				if(!keepFlt) delete o["/Filter"];
			}
			if(prm!=null) {
				if(prm instanceof Array) prm = prm[0];
				if(prm["/Predictor"]!=null && prm["/Predictor"]!=1) {
					var w = prm["/Columns"], bpp = prm["/Colors"] ? prm["/Colors"]: 1, bpl = (bpp*w), h = (buff.length/(bpl+1));
					FromPS._filterZero(buff, 0, w, h, bpp);  buff = buff.slice(0, h*bpl);
				}
			}
			o["stream"] = buff;
		}
		return o["stream"];
	}
	
	
	FromPS._filterZero = function(data, off, w, h, bpp) {  // copied from UPNG.js
		var bpl = bpp*w, paeth = FromPS._paeth;

		for(var y=0; y<h; y++)  {
			var i = off+y*bpl, di = i+y+1;
			var type = data[di-1];

			if     (type==0) for(var x=  0; x<bpl; x++) data[i+x] = data[di+x];
			else if(type==1) {
				for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];
				for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp])&255;
			}
			else if(y==0) {
				for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];
				if(type==2) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x])&255;
				if(type==3) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + (data[i+x-bpp]>>1) )&255;
				if(type==4) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], 0, 0) )&255;
			}
			else {
				if(type==2) { for(var x=  0; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl])&255;  }

				if(type==3) { for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + (data[i+x-bpl]>>1))&255;
							  for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>1) )&255;  }

				if(type==4) { for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + paeth(0, data[i+x-bpl], 0))&255;
							  for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) )&255;  }
			}
		}
		return data;
	}
	
	FromPS._paeth = function(a,b,c) {
		var p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
		if (pa <= pb && pa <= pc)  return a;
		else if (pb <= pc)  return b;
		return c;
	}
	
	
		
	
	
	
	function FromPDF ()
	{
	}
	
	FromPDF.Parse = function(buff, genv)
	{
		buff = new Uint8Array(buff);
		var off = 0;
		while(buff[off]==32) off++;
		if(off!=0) buff = new Uint8Array(buff.buffer, off, buff.length-off);
		
		var offset = buff.length-3;
		while(FromPS.B.readASCII(buff,offset,3) != "%%E") offset--;
		while(buff[offset-1]==37) offset--;
		
		var eoff = offset;
		
		offset--;
		while( FromPS.isEOL(buff[offset])) offset--;
		while(!FromPS.isEOL(buff[offset])) offset--;
		
		var xref = parseInt(FromPS.B.readASCII(buff, offset+1, eoff-offset-1));
		
		if(isNaN(xref)) throw "no xref";
		
		var xr = [];
		var tr = FromPDF.readXrefTrail(buff, xref, xr);  
		if(tr==null || xr[1]==null) {
			console.log("PDF is broken, trying to rebuild");
			while(xr.length!=0) xr.pop();
			tr = FromPDF.brokenXrefTrail(buff,xr);
		}
		//console.log(tr,xr);
		if(tr["/Encrypt"]) {  alert("Encrypted PDFs are not supported yet.");  return;  }
		//console.log(xr);
		
		var file = {buff:buff, off:0}, rt = tr["/Root"];
		if(rt.typ=="ref") tr["/Root"] = FromPDF.getIndirect(rt.ind,rt.gen,file,xr);
		var ps = tr["/Root"]["/Pages"];
		if(ps.typ=="ref") tr["/Root"]["/Pages"] = FromPDF.getIndirect(ps.ind,ps.gen,file,xr)
		
		var stk = [tr["/Root"]["/Pages"]];
		
		while(stk.length!=0) {
			var pg = stk.pop();
			if(pg["/Type"]=="/Pages") {
				var ks = pg["/Kids"];
				for(var i=0; i<ks.length; i++) {
					if(ks[i].typ=="ref") ks[i] = FromPDF.getIndirect(ks[i].ind,ks[i].gen,file,xr);
					FromPDF.solveIndirects(ks[i]["/Resources"],file,xr);
					stk.push(ks[i]);
				}
			}
		}
		
		var time = Date.now();
		FromPDF.render(tr["/Root"], genv, tr);
		genv.Done();
		//console.log(Date.now()-time);
	}
	FromPDF.solveIndirects = function(o, file, xr) {
		/*if(o instanceof Array)   for(var i=0; i<o.length; i++) if(o[i].typ=="ref") {
			o[i] = FromPDF.getIndirect(o[i].ind,o[i].gen,file,xr);
		}*/
		if(typeof o == "object") for(var i in o) if(i.startsWith("/")) {
			if(o[i].typ=="ref") o[i] = FromPDF.getIndirect(o[i].ind,o[i].gen,file,xr);
			FromPDF.solveIndirects(o[i], file, xr);
		}
	}
	FromPDF.render = function(root, genv, tr)
	{		
		var ops = [
			"CS","cs","SCN","scn","SC","sc","sh",
			"Do", "gs", "ID","EI","cm","y","v","B","B*",  "BT","ET",
			"Tj","TJ","Tf","Tm","Td","T*",
			"Tc","Tw","Tz","TL","Tr","Ts",
			"MP","DP","BMC","BDC","EMC","BX","EX",  "ri"
		];
		
		var prcs = {
			"J":"setlinecap",
			"j":"setlinejoin",
			"w":"setlinewidth",
			"d":"setdash",
			"M":"setmiterlimit",
			"i":"setflat",
			"q":"gsave",  "Q":"grestore",
			"m":"moveto",  "l":"lineto",  "c":"curveto", "h":"closepath",
			"re":"_drawRect_",
			"W":"clip",  "W*":"eoclip",
			"f":"fill","F":"fill","f*":"eofill", "S":"stroke",  "b":"h B", "b*":"h B*",
			"n":"newpath",
			
			"RG" : "/DeviceRGB  CS SCN",
			"rg" : "/DeviceRGB  cs scn",
			"G"  : "/DeviceGray CS SCN",
			"g"  : "/DeviceGray cs scn",
			"K"  : "/DeviceCMYK CS SCN",
			"k"  : "/DeviceCMYK cs scn",
			
			"TD" : "dup neg TL Td",
			"\"" : "exch Tc exch Tw '",
			"'"  : "T* Tj",
			
			"s"  : "h S",
			"BI" : "/BI"
		}
		prcs = FromPS.makeProcs(prcs);
		
		var stk = [root["/Pages"]], pi=-1;
		var intr = [-1e9,1e9];//[22,22];  //including
		//intr = [0,1];
		
		while(stk.length!=0) {
			var pg = stk.pop();
			
			if(pg["/Type"]=="/Pages") {
				var ks = pg["/Kids"];
				for(var i=ks.length-1; i>=0; i--) stk.push(ks[i]);
				continue;
			}
			pi++;  if(pi<intr[0]) continue;  
			
			if(pg["/Resources"]==null) pg["/Resources"] = root["/Pages"]["/Resources"];
			var cts = pg["/Contents"];   if(cts==null) continue;
			if(cts.length==null) cts = [cts];
			//var uu = pg["/UserUnit"];  if(uu) console.log(uu);
			
			var rot90 = pg["/Rotate"]!=null && ((pg["/Rotate"]+36000)%360)==90;
			
			var bb = pg["/MediaBox"];  if(bb==null) bb = root["/Pages"]["/MediaBox"];
			if(rot90) bb = [bb[0],bb[1],bb[3],bb[2]];
			var env = FromPS._getEnv(bb);  env.pgOpen = true;
			var gs = [];
			var os = [];	// operand stack
			var ds = FromPS._getDictStack(ops, prcs);
			var es = [];
			
			if(rot90) {  UDOC.M.rotate(env.gst.ctm,Math.PI/2);  UDOC.M.translate(env.gst.ctm, 0,bb[3]);  }
			
			genv.StartPage(bb[0],bb[1],bb[2],bb[3]);
			if(tr["/Encrypt"]) {  if(stk.length==0) alert("Encrypted PDF is not supported yet.");  }
			else
			for(var j=0; j<cts.length; j++)
			{
				if(cts[j].buff==null) continue;
				var cnt = FromPS.GS(cts[j]);  var end=cnt.length-1;  while(cnt[end]==0) end--;
				cnt = new Uint8Array(cnt.buffer, 0, end+1);
				//console.log(FromPS.B.readASCII(cnt,0,cnt.length));
				es.push({  typ:"file", val: {  buff:cnt, off:0, extra:pg, clgrp:false  }  });	// execution stack
				var repeat = true;
				while(repeat) {  repeat = FromPS.step(os, ds, es, gs, env, genv, FromPDF.operator);  }
			}
			genv.ShowPage();  if(pi>=intr[1]) break;
		}
	}
	FromPDF.addCmd = function(str,es,xo) {  
		var l=str.length, fl = new Uint8Array(l);  for(var i=0; i<l; i++) fl[i]=str.charCodeAt(i);
		es.push( {typ:"file", val: { buff:fl, off:0,extra:xo}}  );		
	}
	FromPDF._pushForm = function(es, xo, clgrp,sepEnv) {
		var lmat = xo["/Matrix"]
		if(sepEnv) FromPDF.addCmd("Q", es,xo);
		if(lmat) {  var im = lmat.slice(0);  UDOC.M.invert(im);  FromPDF.addCmd(im.join(" ")+" cm", es,xo);  }
		es.push( {typ:"file", val: { buff:FromPS.GS(xo), off:0, extra:xo, clgrp:clgrp }}  );
		if(lmat) FromPDF.addCmd(lmat.join(" ")+" cm", es,xo);
		if(sepEnv) FromPDF.addCmd("q", es,xo);
	}
	FromPDF.operator = function(op, os, ds, es, gs, env, genv)
	{
		var gst = env.gst;
		var lfi = es.length-1;  while(es[lfi].typ!="file") lfi--;
		var fle = es[lfi].val;
		var res = fle.extra["/Resources"];
		if(op=="Do") {
			var nam = os.pop().val;  //nam=nam.replace("_","#5F");console.log(nam);
			var xo = res["/XObject"][nam];
			//console.log(xo);
			var st=xo["/Subtype"];
			if(st=="/Form")  {
				var gr = xo["/Group"];
				var clgrp = false
				if(gr!=null) {  // Transparency Group
					//if(gr["/S"]!="/Transparency") throw "e";
					//console.log(gr);
					clgrp = true;
				}
				//console.log(FromPS.B.readASCII(stm,0,stm.length));
				if(xo["/Resources"]==null) xo["/Resources"]=res;
				FromPDF._pushForm(es,xo,clgrp);
			}
			else if(st=="/Image")  {
				var w=xo["/Width"], h=xo["/Height"], cs=xo["/ColorSpace"], sm=xo["/SMask"];
				var img = FromPDF.getImage(xo), imG = FromPDF.getJBIG2Glob(xo);
				
				var sms, smG;  //console.log(xo, JSON.parse(JSON.stringify(gst)));  throw "e";
				if(sm) {
					var mw=sm["/Width"], mh=sm["/Height"];
					if(mw!=w || mh!=h) {
						var nimg = new Uint32Array(mw*mh);
						var oimg = new Uint32Array(img.buffer.slice(0,4));
						nimg.fill(oimg[0]);
						w=mw;  h=mh;  img=new Uint8Array(nimg.buffer);
					}
					sms = FromPDF.getImage    (xo["/SMask"]);
					smG = FromPDF.getJBIG2Glob(xo["/SMask"]);
				}
				if(xo["/ImageMask"]==true) {
					sms = img;  smG = imG;
					img = new Uint8Array(w*h*4);  imG = null;
					var r0 = gst.colr[0]*255, g0 = gst.colr[1]*255, b0 = gst.colr[2]*255;
					for(var i=0; i<w*h*4; i+=4) {  img[i]=r0;  img[i+1]=g0;  img[i+2]=b0;  img[i+3]=255;  }
				}
				//console.log(fle.clgrp);
				//if(FromPDF._xy==null) FromPDF._xy = 0;  FromPDF._xy++;  if(FromPDF._xy==1) 
				genv.PutImage(gst, img, w,h, sms, imG, smG);
			}
			else console.log("Unknown XObject",st);
		}
		else if(op=="gs") {
			var nm = os.pop().val;
			var egs = res["/ExtGState"][nm];
			for(var p in egs) {
				var v = egs[p];
				if(p=="/Type") continue;
				else if(p=="/CA") gst.CA = fle.clgrp ? gst.CA*v : v;
				else if(p=="/ca") gst.ca = fle.clgrp ? gst.ca*v : v;
				else if(p=="/BM") {  if(!fle.clgrp || gst.bmode=="/Normal") gst.bmode = v;  }
				else if(p=="/LC") gst.lcap  = v;
				else if(p=="/LJ") gst.ljoin = v;
				else if(p=="/LW") gst.lwidth = v;
				else if(p=="/ML") gst.mlimit = v;
				else if(p=="/SA") gst.SA = v;
				else if(p=="/OPM")gst.OPM = v;
				else if(p=="/AIS")gst.AIS = v;
				else if(p=="/OP") gst.OP = v;
				else if(p=="/op") gst.op = v;
				else if(p=="/SMask") {  gst.SMask = "";  }
				else if(p=="/SM") gst.SM = v;
				else if(p=="/HT" || p=="/TR") {}
				else console.log("Unknown gstate property: ", p, v);
			}
		}
		else if(op=="ID") {
			var dic = {};
			while(true) {  var v = os.pop().val;  if(v=="/BI") break;  dic[os.pop().val] = v;  }    fle.off++;
			var w=dic["/W"], h=dic["/H"], ar=w*h, img = new Uint8Array(ar*4), cs = dic["/CS"], bpc = dic["/BPC"];
			var end = fle.off;
			while(!FromPS.isWhite(fle.buff[end]) || fle.buff[end+1]!=69 || fle.buff[end+2]!=73) end++;
			var stm = fle.buff.slice(fle.off, end);  fle.off+=stm.length;
			if(dic["/F"]=="/Fl") {
				var obj = {"buff":stm,"/Filter":"/FlateDecode"};
				if(dic["/DP"]) {
					var prm=obj["/DecodeParms"]={}, eprm=["Predictor","Columns","Colors"];
					for(var i=0; i<3; i++) if(dic["/DP"][eprm[i]]) prm["/"+eprm[i]] = dic["/DP"][eprm[i]].val;			
				}
				stm = FromPS.GS(obj);  delete dic["/F"];  delete dic["/DP"];
			}
			if(cs=="/G" && dic["/F"]==null) {
				FromPDF.plteImage(stm, 0, img, null, w, h, bpc);
			}
			else if(cs=="/RGB" && dic["/F"]==null && stm.length==w*h*3) {
				for(var i=0; i<ar; i++) {  var ti=i*3,qi=i*4;  img[qi]=stm[ti];  img[qi+1]=stm[ti+1];  img[qi+2]=stm[ti+2];  img[qi+3]=255;      }
			}
			else if(cs && cs[0].typ!=null) {
				FromPDF.plteImage(stm, 0, img, cs[3].val, w, h, bpc);
			}
			else img = stm;
			// if(img.length!=w*h*4) throw "e";  // "2792 BFD 13-23 Blending Facility.pdf" has CCITT
			genv.PutImage(gst, img, w,h);
		}
		else if(op=="n" || op=="BT" || op=="EI") {}
		else if(op=="ET") {  gst.font.Tm = [1,0,0,1,0,0];  gst.font.Tlm=gst.font.Tm.slice(0);  }
		else if(op=="y" || op=="v") {
			var im=gst.ctm.slice(0);  UDOC.M.invert(im);  var p=UDOC.M.multPoint(im,gst.cpos);  
			var y3=os.pop().val, x3=os.pop().val, y1=os.pop().val, x1=os.pop().val;
			if(op=="y") UDOC.G.curveTo(gst,x1,y1,x3,y3,x3,y3);
			else        UDOC.G.curveTo(gst,p[0],p[1],x1,y1,x3,y3);
		}
		else if(op=="B" || op=="B*") {
			genv.Fill(gst, op=="B*");    //UDOC.G.newPath(gst);
			genv.Stroke(gst);  UDOC.G.newPath(gst);
		}
		else if(op=="cm" || op=="Tm") {
			var m = [];  for(var i=0; i<6; i++) m.push(os.pop().val);    m.reverse();  
			
			if(op=="cm") {  UDOC.M.concat(m, gst.ctm);  gst.ctm = m;    }
			else         {  gst.font.Tm = m;  gst.font.Tlm = m.slice(0);  }
		}
		else if(op=="Td" || op=="T*") {
			var x=0, y=0;
			if(op=="T*") { x=0; y=-gst.font.Tl; }
			else { y=os.pop().val;  x=os.pop().val; }
			var tm = [1,0,0,1,x,y];  UDOC.M.concat(tm,gst.font.Tlm);
			gst.font.Tm = tm;  gst.font.Tlm = tm.slice(0);
		}
		else if(op=="Tf") {
			var sc = os.pop().val, fnt = os.pop().val;
			gst.font.Tf=fnt;//rfnt["/BaseFont"].slice(1);
			gst.font.Tfs=sc;  //os.push(fnt);
		}
		else if(op=="Tj" || op=="TJ") {
			var sar = os.pop();
			if(sar.typ=="string") sar = [sar];
			else sar = sar.val;
			
			//var rfnt = res["/Font"][fnt];
			
			var tf = gst.font.Tf;
			var fnt = res["/Font"][tf];
			var scl = /*UDOC.M.getScale(gst.font.Tm)* */gst.font.Tfs/1000;
			
			var moveTm=function(font,dx) {  /*font.Tm[4]+=dx;*/ var ntm = [1,0,0,1,dx,0];  UDOC.M.concat(ntm,font.Tm);  font.Tm = ntm;  }
			
			for(var i=0; i<sar.length; i++) {
				//if(sar[i].typ!="string") {  gst.font.Tm[4] += -scl*sar[i].val;  continue;  }
				if(sar[i].typ!="string") {  if(i==0) moveTm(gst.font,-scl*sar[i].val);  continue;  }
				var str = FromPDF.getString(sar[i].val, fnt);
				if(sar[i+1] && sar[i+1].typ!="string") {  var sv = sar[i+1].val;  str[1] += -sv;  if(-900<sv && sv<-100) str[0]+=" ";  }
				
				gst.font.Tf = str[2];
				genv.PutText(gst, str[0], str[1]/1000);  //gst.cpos[0] += str.length*gst.font.mat[0]*0.5;  
				gst.font.Tf = tf;
				moveTm(gst.font,scl*str[1]);
				//gst.font.Tm[4] += scl*str[1];
			}
		}
		else if(op=="Tc") gst.font.Tc = os.pop().val;
		else if(op=="Tw") gst.font.Tw = os.pop().val;
		else if(op=="Tz") gst.font.Th = os.pop().val;
		else if(op=="TL") gst.font.Tl = os.pop().val;
		else if(op=="Tr") gst.font.Tmode = os.pop().val;
		else if(op=="Ts") gst.font.Trise = os.pop().val;
		else if(op=="CS"  || op=="cs" ) {  var cs = os.pop().val;  if(op=="CS") gst.sspace=cs;  else gst.space=cs;  }
		else if(op=="SCN" || op=="scn" || op=="SC" || op=="sc") {
			var stk = (op=="SCN" || op=="SC");
			var csi =  stk ? gst.sspace : gst.space, cs, c = null;
			//console.log(op, cs, os);  throw "e";
			var sps = res ? res["/ColorSpace"] : null;  //if(sps!=null) console.log(sps[csi]);
			if(sps!=null && sps[csi]!=null) {
				if(sps[csi][1] && sps[csi][1]["/Alternate"])  cs = sps[csi][1]["/Alternate"];  //cs = sps[csi][0];
				else cs = (typeof sps[csi] == "string") ? sps[csi] : sps[csi][0];
			}
			else cs = csi;
			//console.log(sps, cs, os.slice(0));
			if(cs=="/DeviceN") {
				var csp = sps[csi], domN = csp[1].length;
				for(var i=0; i<domN; i++) os.pop();
				c=[1,0,0];
			}
			else if(cs=="/Lab" || cs=="/DeviceRGB" || cs=="/CalRGB" || (cs=="/ICCBased" && sps[csi][1]["/N"]==3)) {  
					c=[os.pop().val, os.pop().val, os.pop().val];  c.reverse();  }
			else if(cs=="/DeviceCMYK" || (cs=="/ICCBased" && sps[csi][1]["/N"]==4)) {  
					var cmyk=[os.pop().val,os.pop().val,os.pop().val,os.pop().val];  cmyk.reverse();  c = UDOC.C.cmykToRgb(cmyk);  }
			else if(cs=="/DeviceGray" || cs=="/CalGray" || (cs=="/ICCBased" && sps[csi][1]["/N"]==1)) {  var gv=FromPS.nrm(os.pop().val);  c=[gv,gv,gv];  }
			else if(cs=="/Separation") {  
				c = FromPS._readSeparation(sps[csi], os.pop().val);
			}
			//else if(cs=="/CalRGB") {  c = [1,0,1];  }
			else if(cs=="/Pattern")    {  
				//*
				var pt = res["/Pattern"][os.pop().val];  //console.log(pt);
				var ptyp = pt["/PatternType"];
				if(ptyp==1) {  console.log("tile pattern");  FromPDF._pushForm(es,pt,clgrp,true);  return;  }
				var mat = pt["/Matrix"];  if(mat==null) mat=[1,0,0,1,0,0];
				c = FromPS.getShadingFill(pt["/Shading"], mat);  if(c==null) c=[0,0,0];
				//return;//*/  os.pop();  c=[1,0.5,0]; 
			}
			else {  console.log(csi, cs, sps, res);  throw("e");  }
			//console.log(c);
			if(stk) gst.COLR = c;  else gst.colr=c;
		}
		else if(op=="sh")  {  //os.pop();  return;
			//if(window.asdf==null) window.asdf=0;
			//window.asdf++;  if(window.asdf!=6) return;
			var sh = res["/Shading"][os.pop().val];  //console.log(sh);
			var ocolr = gst.colr, opth = gst.pth;
			gst.pth = gst.cpth;  gst.cpth = UDOC.G.rectToPath(env.bb);
			gst.colr = FromPS.getShadingFill(sh, gst.ctm.slice(0));  if(gst.colr==null) gst.colr = [0,0,0];
			//console.log(gst);

			genv.Fill(gst);
			gst.colr = ocolr;  gst.pth = opth;
		}
		else if(op=="MP" || op=="BMC" || op=="ri") {  os.pop();  }
		else if(op=="DP" || op=="BDC") {  os.pop();  os.pop();  }
		else if(op=="EMC"|| op=="BX" || op=="EX") {  }
		else 
			throw ("Unknown operator", op);
	}	
	
	
	FromPDF.getJBIG2Glob = function(xo) {
		var gl=xo;
		gl = gl["/DecodeParms" ];  if(gl==null)return null;
		gl = gl["/JBIG2Globals"];  if(gl==null)return null;
		return FromPS.GS(gl);
	}
	FromPDF.getImage = function(xo) {
		var w=xo["/Width"], h=xo["/Height"], ar = w*h, stm=FromPS.GS(xo), ft=xo["/Filter"], cs=xo["/ColorSpace"], bpc=xo["/BitsPerComponent"], mte=xo["/Matte"];
		//if(w==295 && h==98) console.log(xo);
		//if(w=="327" && h==9) console.log(xo);
		var img = xo["image"];  //console.log(xo);
		if(img==null) {
			//console.log(xo);
			var msk = xo["/Mask"];
			if(cs && cs[0]=="/Indexed") {
				var pte;
				if(cs[3].length!=null) {	// palette in a string
					var str = cs[3];  pte = new Uint8Array(256*3);
					for(var i=0; i<str.length; i++) pte[i] = str.charCodeAt(i);
				}							
				else pte = FromPS.GS(cs[3]);
				if(cs[1]=="/DeviceCMYK" || (cs[1] && cs[1][1] && cs[1][1]["/N"]==4)) {
					var opte = pte, pte = new Uint8Array(256*3);
					for(var i=0; i<256; i++) {  var qi=(i<<2), ti=qi-i, rgb = UDOC.C.cmykToRgb([opte[qi]/255, opte[qi+1]/255, opte[qi+2]/255, opte[qi+3]/255]);  
						pte[ti]=rgb[0]*255;  pte[ti+1]=rgb[1]*255;  pte[ti+2]=rgb[2]*255;  
						//var ib = 1-(opte[qi+3]/255);  pte[ti]=(255-opte[qi])*ib;  pte[ti+1]=(255-opte[qi+1])*ib;  pte[ti+2]=(255-opte[qi+2])*ib;  
					}
				}
				var nc = new Uint8Array(ar*4);
				FromPDF.plteImage(stm, 0, nc, pte, w, h, bpc, msk);
				img=nc;
			}
			else if(ft==null && cs && cs=="/DeviceGray") {
				var pte = [0,0,0,255,255,255], nc = new Uint8Array(ar*4);
				if(xo["/Decode"] && xo["/Decode"][0]==1) {  pte.reverse();  }
				if(xo["/ImageMask"]==true)  pte.reverse();
				FromPDF.plteImage(stm, 0, nc, bpc==1?pte:null, w, h, bpc, msk);
				img=nc;
			}
			else if(ft==null && cs && (cs=="/DeviceCMYK" || (cs[0]=="/ICCBased" && cs[1] && cs[1]["/N"]==4))) {  // CMYK
				var nc = new Uint8Array(ar*4), cmy=[0,0,0,0];
				for(var i=0; i<ar; i++) {
					var qi = i*4;  cmy[0]=stm[qi]*(1/255);  cmy[1]=stm[qi+1]*(1/255);  cmy[2]=stm[qi+2]*(1/255);   cmy[3]=stm[qi+3]*(1/255);  
					var rgb = UDOC.C.cmykToRgb(cmy);
					nc[qi  ]=~~(rgb[0]*255+0.5);  
					nc[qi+1]=~~(rgb[1]*255+0.5);  
					nc[qi+2]=~~(rgb[2]*255+0.5);  
					nc[qi+3]=255;  
				}
				img = nc;
			}
			else if(w*h*3<=stm.length) {
				var mlt = Math.round(255/((1<<bpc)-1));
				var bpl = Math.ceil(w*3*bpc/8);
				var nc = new Uint8Array(ar*4);
				for(var y=0; y<h; y++) {
					var so = bpl * y; 
					for(var x=0; x<w; x++)
					{  
						var qi=(y*w+x)*4, tx=3*x; 
						nc[qi  ]=FromPDF.getBitNum(stm, so, tx  , bpc);  
						nc[qi+1]=FromPDF.getBitNum(stm, so, tx+1, bpc);  
						nc[qi+2]=FromPDF.getBitNum(stm, so, tx+2, bpc);  
						nc[qi+3]=255;  
					}
				}
				img = nc;
			}
			else {  img = stm;  }
			if(mte && mte.join("")!="000") {
				var r = Math.round(mte[0]*255), g=Math.round(mte[1]*255), b=Math.round(mte[2]*255);
				for(var i=0; i<img.length; i+=4) {
					img[i  ]=Math.max(img[i  ],r);
					img[i+1]=Math.max(img[i+1],g);
					img[i+2]=Math.max(img[i+2],b);
				}
			}
			xo["image"] = img;
		}
		return img;
	}
	FromPDF.plteImage = function(buff, off, img, plt, w, h, bpc, msk)
	{
		var mlt = Math.round(255/((1<<bpc)-1));
		var bpl = Math.ceil(w*bpc/8);
		for(var y=0; y<h; y++) {
			var so = off + bpl * y; 
			for(var x=0; x<w; x++) {  
				var ci = FromPDF.getBitNum(buff, so, x, bpc);
				var qi = (y*w+x)<<2;  
				if(plt) {  var c =ci*3;    img[qi]=plt[c];  img[qi+1]=plt[c+1];  img[qi+2]=plt[c+2];  }
				else    {  var nc=ci*mlt;  img[qi]=nc;      img[qi+1]=nc;        img[qi+2]=nc;        }
				img[qi+3]=255;  
				if(msk && msk[0]<=ci && ci<=msk[1]) img[qi+3]=0; 
			}
		}
	}
	FromPDF.getBitNum = function(buff, so, x, bpc) {
		var ci = 0;
		if     (bpc==8) ci = buff[so+x];
		else if(bpc==4) ci=(buff[so+(x>>1)]>>((1-(x&1))<<2))&15;
		else if(bpc==2) ci=(buff[so+(x>>2)]>>((3-(x&3))<<1))&3;  
		else if(bpc==1) ci=(buff[so+(x>>3)]>>((7-(x&7))<<0))&1;
		return ci;
	}
	
	
	FromPDF.getString = function(sv, fnt)
	{
		var st = fnt["/Subtype"], s="", m=0, psn=null;
		var tou = fnt["/ToUnicode"], enc = fnt["/Encoding"], sfnt=fnt;	// font with a stream
		if(tou!=null && typeof tou != "object") tou = null;
		if(st=="/Type0") sfnt = fnt["/DescendantFonts"][0];  // // only in type 0
		
		if(tou!=null) s = FromPDF.toUnicode(sv, tou);
		else if(enc=="/WinAnsiEncoding" ) s = FromPDF.encFromMap(sv, FromPDF._win1252);
		else if(enc=="/MacRomanEncoding") s = FromPDF.encFromMap(sv, FromPDF._macRoman);
		else if(st=="/Type0") {
			var off=0;
			var ordr = sfnt["/CIDSystemInfo"]["/Ordering"];
			if     (ordr=="Identity") off= 0;
			else if(ordr=="Japan1"  ) off=31;
			else if(ordr=="GB1"     ) off=31;
			else if(ordr=="CNS1"    ) off=31;
			else if(ordr=="Korea1"  ) off=31;
			else throw ordr;
			
			for(var j=0; j<sv.length; j+=2) {
				var gid = (sv[j]<<8)|sv[j+1];  //console.log(gid, stm);
				s += String.fromCharCode(gid+off);  // don't know why 31
			}
		}
		else if(enc!=null && enc["/Type"]=="/Encoding") {
			var dfs = enc["/Differences"];
			var benc = enc["/BaseEncoding"], map = null;
			if(benc=="/WinAnsiEncoding" ) map = FromPDF._win1252;
			if(benc=="/MacRomanEncoding") map = FromPDF._macRoman;
			if(dfs) {
				//console.log(sv,dfs);
				var s = "";
				for(var i=0; i<sv.length; i++) {
					var ci = sv[i], coff=-5, found = false;
					for(var j=0; j<dfs.length; j++)
					{
						if(typeof dfs[j] == "string") {  if(ci==coff) {  s+=FromPDF.fromCName(dfs[j].slice(1));  found=true;  break;  }  coff++;  }
						else coff=dfs[j];
					}
					if(!found && map!=null) {
						var cin = map.indexOf(ci);
						if(cin!=-1) ci = String.fromCharCode(map[cin+1]);
						s += String.fromCharCode(ci);
					}
					else if(!found) s += String.fromCharCode(ci);
				}
				//console.log(s);
			}
			//console.log(enc, sv);	throw "e";
			//s = FromPDF.fromWin(sv);
		}
		else {  /*console.log("reading simple string", sv, fnt);*/  s = FromPS.readStr(sv);  }
		
		//console.log(sv, fnt);
		if(st=="/Type0") {
			//console.log(fnt);  //throw "e";
			var ws = sfnt["/W"];  if(ws && ws.length==0) ws=null;
			if(ws==null) {  m = s.length*1000*0.4;  console.log("approximating word widths");  }
			else
			for(var i=0; i<sv.length; i+=2) {
				var cc = (sv[i]<<8)|sv[i+1], gotW = false;
				for(var j=0; j<ws.length; j+=2) {
					var i0=ws[j], i1 = ws[j+1];
					if(i1.length) {   if(0<=cc-i0 && cc-i0<i1.length) {  m += i1[cc-i0];  gotW=true;  }   }
					else {  if(i0<=cc && cc<=i1) {  m += ws[j+2];  gotW = true;  }  j++;  }
				}
				if(!gotW) m += ws[1][0];
			}
		}
		else if(st=="/Type1" || st=="/Type3" || st=="/TrueType") {
			var fc=fnt["/FirstChar"], ws = fnt["/Widths"];
			if(ws)	for(var i=0; i<sv.length; i++) m += ws[sv[i]-fc];
			else    {  m = s.length*1000*0.4;  console.log("approximating word width");  }
		}
		else throw "unknown font type";
		
		//console.log(fnt);//  throw "e";
		//console.log(sfnt);
		var fd = sfnt["/FontDescriptor"];
		var pp, ps = ["","2","3"];
		for(var i=0; i<3; i++) if(fd && fd["/FontFile"+ps[i]]) pp = "/FontFile"+ps[i];
		
		if(fd) {
			if(fd["psName"]) psn=fd["psName"];
			else if(pp) {
				var fle = FromPS.GS(fd[pp]);
				if(pp!=null && fle && FromPS.B.readUint(fle,0)==65536) psn = fd["psName"] = FromPDF._psName(fle);
			}
		}
		
		//if(pp && FromPS.GS(fd[pp]) &&  fnt.__a==null) {  //console.log(fnt);  fnt.__a = 1;  
			//var ff = FromPS.GS(fd[pp]);  //ff[0]=ff[2]=ff[3]=0;   ff[1]=1; 
			//FileLoader.save(ff.buffer, "font.ttf")  
		//}
		
		if(psn==null && fnt["/BaseFont"]) psn = fnt["/BaseFont"].slice(1);
		if(psn==null || psn=="") psn = "DejaVuSans";
		//if(sv.length==9) console.log(s);
		return [s, m, psn];
	}
	FromPDF._psName = function(fle) {
		var rus = FromPS.B.readUshort;
		var num = rus(fle, 4);
		
		var noff = 0;
		for(var i=0; i<num; i++) {
			var tn = FromPS.B.readASCII(fle,12+i*16,4), to = FromPS.B.readUint(fle, 12+i*16+8);
			if(tn=="name") {  noff=to;  break;  }
		}
		if(noff==0) return null;

		var cnt=rus(fle, noff+2);
		var offset0=noff+6, offset=noff+6;
		for(var i=0; i<cnt; i++) {
			var platformID = rus(fle, offset   );
			var eID        = rus(fle, offset+ 2);	// encoding ID
			var languageID = rus(fle, offset+ 4);
			var nameID     = rus(fle, offset+ 6);
			var length     = rus(fle, offset+ 8);
			var noffset    = rus(fle, offset+10);
			offset += 12;
			
			var s;
			var soff = offset0 + cnt*12 + noffset;
			if(eID==1 || eID==10 || eID==3) {  s="";  for(var j=1; j<length; j+=2) s += String.fromCharCode(fle[soff+j]);  }
			if(eID==0 || eID== 2) s = FromPS.B.readASCII(fle, soff, length);
			if(nameID==6 && s!=null && s.slice(0,3)!="OTS") return s.replace(/\s/g, "");
		}
		return null;
	}
	FromPDF.encFromMap = function(sv, map)
	{
		var s="";
		for(var j=0; j<sv.length; j++) {
			var cc = sv[j], ci = map.indexOf(cc);
			if(ci!=-1) cc = map[ci+1];
			s+=String.fromCharCode(cc);
		}
		return s;
	}
	
	FromPDF._win1252  = [ 0x80, 0x20AC, 0x82, 0x201A, 0x83, 0x0192,	0x84, 0x201E, 0x85, 0x2026, 0x86, 0x2020, 0x87, 0x2021, 0x88, 0x02C6, 0x89, 0x2030,
0x8A, 0x0160, 0x8B, 0x2039, 0x8C, 0x0152, 0x8E, 0x017D, 0x91, 0x2018, 0x92, 0x2019, 0x93, 0x201C, 0x94, 0x201D, 0x95, 0x2022, 0x96, 0x2013,
0x97, 0x2014, 0x98, 0x02DC, 0x99, 0x2122, 0x9A, 0x0161, 0x9B, 0x203A, 0x9C, 0x0153, 0x9E, 0x017E, 0x9F, 0x0178	];

	FromPDF._macRoman = [ 0x80,0xc4, 0x81,0xc5, 0x82,0xc7, 0x83,0xc9, 0x84,0xd1, 0x85,0xd6, 0x86,0xdc, 0x87,0xe1, 
					   0x88,0xe0, 0x89,0xe2, 0x8a,0xe4, 0x8b,0xe3, 0x8c,0xe5, 0x8d,0xe7, 0x8e,0xe9, 0x8f,0xe8,
					   
					   0x90,0xea, 0x91,0xeb, 0x92,0xed, 0x93,0xec, 0x94,0xee, 0x95,0xef, 0x96,0xf1, 0x97,0xf3,
					   0x98,0xf2, 0x99,0xf4, 0x9a,0xf6, 0x9b,0xf5, 0x9c,0xfa, 0x9d,0xf9, 0x9e,0xfb, 0x9f,0xfc,
					   
					   0xa0,0x2020, 0xa1,0xb0, 0xa2,0xa2, 0xa3,0xa3, 0xa4,0xa7, 0xa5,0x2022, 0xa6,0xb6, 0xa7,0xdf,
					   0xa8,0xae, 0xa9,0xa9, 0xaa,0x2122, 0xab,0xb4, 0xac,0xa8, 0xad,0x2660, 0xae,0xc6, 0xaf,0xd8,
					   
					   0xb0,0x221e, 0xb1,0xb1, 0xb2,0x2264, 0xb3,0x2265, 0xb4,0xa5, 0xb5,0xb5, 0xb6,0x2202, 0xb7,0x2211, 
					   0xb8,0x220f, 0xb9,0x3c0, 0xba,0x222b, 0xbb,0xaa, 0xbc,0xba, 0xbd,0x3a9, 0xbe,0xe6, 0xbf,0xf8,
					   
					   0xc0,0xbf, 0xc1,0xa1, 0xc2,0xac, 0xc3,0x221a, 0xc4,0x192, 0xc5,0x2248, 0xc6,0x2206, 0xc7,0xab,
					   0xc8,0xbb, 0xc9,0x2026, 0xca,0xa0, 0xcb,0xc0, 0xcc,0xc3, 0xcd,0xd5, 0xce,0x152, 0xcf,0x153,
					   
					   0xd0,0x2013, 0xd1,0x2014, 0xd2,0x201c, 0xd3,0x201d, 0xd4,0x2018, 0xd5,0x2019, 0xd6,0xf7, 0xd7,0x25ca, 
					   0xd8,0xff, 0xd9,0x178, 0xda,0x2044, 0xdb,0x20ac, 0xdc,0x2039, 0xdd,0x203a, 0xde,0xfb01, 0xdf,0xfb02, 
					   
					   0xe0,0x2021, 0xe1,0xb7, 0xe2,0x201a, 0xe3,0x201e, 0xe4,0x2030, 0xe5,0xc2, 0xe6,0xca, 0xe7,0xc1, 
					   0xe8,0xcb, 0xe9,0xc8, 0xea,0xcd, 0xeb,0xce, 0xec,0xcf, 0xed,0xcc, 0xee,0xd3, 0xef,0xd4, 
					   
					   0xf0,0xf8ff, 0xf1,0xd2, 0xf2,0xda, 0xf3,0xdb, 0xf4,0xd9, 0xf5,0x131, 0xf6,0x2c6, 0xf7,0x2dc, 
					   0xf8,0xaf, 0xf9,0x2d8, 0xfa,0x2d9, 0xfb,0x2da, 0xfc,0xb8, 0xfd,0x2dd, 0xfe,0x2db, 0xff,0x2c7   ];
	
	FromPDF.fromCName = function(cn)
	{
		if(cn=="f_f_i") return "ffi";
		if(cn.length==1) return cn;
		if(cn.slice(0,3)=="uni") return String.fromCharCode(parseInt(cn.slice(3),16));
		//var gi = parseInt(cn.slice(1));  if(cn.charAt(0)=="g" && !isNaN(gi)) return String.fromCharCode(gi);
		var map = {
			"space":32,"exclam":33,"quotedbl":34,"numbersign":35,"dollar":36,"percent":37,"parenleft":40,
			"parenright":41,"asterisk":42,"plus":43,"comma":44,"hyphen":45,"period":46,"slash":47,
			"zero":48,"one":49,"two":50,"three":51,"four":52,"five":53,"six":54,"seven":55,"eight":56,"nine":57,
			"colon":58,"semicolon":59,"less":60,"equal":61,"at":64,
			"bracketleft":0x5b,"bracketright":0x5d,"underscore":0x5f,"braceleft":0x7b,"braceright":0x7d,
			"dieresis":0xa8,"circlecopyrt":0xa9,"degree":0xb0,"plusminus":0xb1,"Eacute":0xc9,
			"Adieresis":0xc4,"adieresis":0xe4,"Udieresis":0xdc,"germandbls":0x00df,"udieresis":0xfc,"Odieresis":0xd6,"odieresis":0xf6,
			"Cacute":0x106,"cacute":0x107,
			"Ccaron":0x10c, "ccaron":0x10d, "Dcroat":0x110,"dcroat":0x111,
			"dotlessi":0x0131,"Scaron":0x160,"scaron":0x161,"Tcaron":0x164,"tcaron":0x165,"Zcaron":0x17d,"zcaron":0x17e,
			"alpha":0x03B1,"phi":0x03C6,
			"endash":0x2013,"emdash":0x2014,"asteriskmath":0x2217,"quoteright":0x2019,"quotedblbase":0x201e,"ellipsis":0x2026,
			"quotedblleft":0x201C,"quotedblright":0x201D,"bullet":0x2022,
			"minus":0x2202,
			"fi": 0xFB01,"fl":0xFB02 };
		var mc = map[cn];
		if(mc==null) {  if(cn.charAt(0)!="g") console.log("unknown character "+cn);  
			return cn;  }
		return String.fromCharCode(mc);
	}
	
	FromPDF.toUnicode = function(sar, tou) {
		var cmap = tou["cmap"], s = "", cstr;
		if(cmap==null) {
			var file = {buff:FromPS.GS(tou), off:0};
			//cstr = PUtils.readASCII(file.buff,0,file.buff.length);
			//console.log(FromPS.B.readASCII(file.buff, 0, file.buff.length));
			var os = [];	// operand stack
			var ds = FromPS._getDictStack({});
			var es = [{  typ:"file", val: file  }];	// execution stack
			var gs = [];
			var env = FromPS._getEnv([0,0,1,1]);  env.pgOpen = true;
			var repeat = true;
			while(repeat) repeat = FromPS.step(os, ds, es, gs, env, null, FromPS.operator, true);
			cmap = env.res["CMap"].val;
			tou["cmap"] = cmap;
			//console.log(cmap);  throw "e";
		}
		//cmap = cmap["Adobe-Identity-UCS"];
		for(var p in cmap) {  cmap=cmap[p].val;  break;  }
		//console.log(cmap, sar);  throw "e";
		var bfr = cmap.bfrange, bfc = cmap.bfchar, bpc = cmap["bpc"];
		//if(bpc==2 && cstr!=null) {  console.log(cstr);  console.log(sar);  }
		for(var i=0; i<sar.length; i+=bpc) {
			var cc = sar[i];  if(bpc==2) cc = (cc<<8) | sar[i+1];
			var mpd = false;
			if(!mpd && bfr) for(var j=0; j<bfr.length; j+=3) {
				var v0=bfr[j], v1=bfr[j+1], v2=bfr[j+2];
				if(v0<=cc && cc<=v1) {  
					if(v2.length==null) cc+=v2-v0;  
					else cc = v2[cc-v0];
					mpd=true;  break;  
				}
			}
			if(!mpd && bfc) for(var j=0; j<bfc.length; j+=2) if(bfc[j]==cc) {  cc=bfc[j+1];  mpd=true;  break;  }
			s += String.fromCharCode(cc);
		}
		return s;
	}
	
	FromPDF.brokenXrefTrail = function(buff, out) {
		function readInt(b, o) {
			var oo=o;
			while(48<=b[o] && b[o]<=57) o++;
			return FromPS.B.readASCII(b, oo, o-oo);
		}
		var tr;
		
		var len = buff.length;
		for(var i=0; i<len; i++) {
			if(FromPS.isEOL(buff[i])) {
				var to = i;
				while(FromPS.isWhite(buff[to])) to++;
				
				var oi = readInt(buff,to);
				if(oi!="") {
					to += oi.length;
					
					while(FromPS.isWhite(buff[to])) to++;
					
					var gi = readInt(buff,to);  
					if(gi!="") {
						to += gi.length;
						
						while(FromPS.isWhite(buff[to])) to++;
						
						if(FromPS.B.readASCII(buff,to,3)=="obj") {
							out[parseInt(oi)]={off:i+1, gen:parseInt(gi), chr:"n"};
							i = to;
						}
					}
				}
				else if(buff[to]==116 && buff[to+1]==114 && FromPS.B.readASCII(buff,to,7)=="trailer") {
					if(tr==null) tr = FromPDF._readTrailer(buff,to+8,out);
				}
				else if(buff[to]==115 && buff[to+1]==116 && FromPS.B.readASCII(buff,to,9)=="startxref") {
					to+=10;  while(FromPS.isWhite(buff[to])) to++;
					var xri = parseInt(readInt(buff,to));
					if(xri!=0 && tr==null) tr = FromPDF.readXrefTrail(buff, xri, out);
				}
			}
		}
		return tr;
	}
	FromPDF._readTrailer = function(buff, off, out) {
		var file = {buff:buff, off:off};//, trw = FromPS.getFToken(file);
		var trl = FromPDF.readObject(file, file, out);
		if(trl["/Prev"]) FromPDF.readXrefTrail(buff, trl["/Prev"], out);
		return trl;
	}

	FromPDF.readXrefTrail = function(buff, xref, out)
	{
		var kw = FromPS.B.readASCII(buff, xref, 4);
		if(kw=="xref") {
			var off = xref+4;  
			if(buff[off]==13) off++;  if(buff[off]==10) off++;
			while(true) {	// start of the line with M, N
				if(FromPS.B.readASCII(buff, off, 7)=="trailer") {  off+=7;   if(buff[off]==13) off++;  if(buff[off]==10) off++;   break;  }
				var of0 = off;
				while(!FromPS.isEOL(buff[off])) off++;  
				var line = FromPS.B.readASCII(buff,  of0, off-of0);  //console.log(line);  
				line = line.split(" ");
				var i0 = parseInt(line[0]);  if(i0==1) i0=0;  // overcome the error in 2019_07_06_162311.pdf
				var n = parseInt(line[1]);
				if(buff[off]==13) off++;  if(buff[off]==10) off++;
				for(var i=0; i<n; i++)
				{
					var li = i0+i;
					if(out[li]==null) out[li] = {
						off: parseInt(FromPS.B.readASCII(buff, off, 10)),
						gen: parseInt(FromPS.B.readASCII(buff, off+11, 5)),
						chr: FromPS.B.readASCII(buff, off+17, 1),
						val: null,
						opn: false
					};
					off+=20;
				}
			}
			return FromPDF._readTrailer(buff,off,out);
		}
		else {
			var off = xref;
			while(!FromPS.isEOL  (buff[off])) off++;
			while( FromPS.isWhite(buff[off])) off++;
			//while(FromPS.B.readASCII(buff,off,2)!="<<") off++;
			
			if(FromPS.B.readASCII(buff,off,2)=="<<") {
				var file = {buff:buff, off:off};
				var xr = FromPDF.readObject(file, file, null);  //console.log(xr);
				var sof = 0, sb = FromPS.GS(xr), w = xr["/W"], idx = xr["/Index"], tis = [];
				if(idx) {  for(var i=0; i<idx.length; i+=2) {  for(var j=0; j<idx[i+1]; j++) tis.push(idx[i]+j);  }  }
				var i = 0;
				while(sof<sb.length) {
					var typ=FromPDF.getInt(sb,sof,w[0]);  sof+=w[0];
					var a  =FromPDF.getInt(sb,sof,w[1]);  sof+=w[1];
					var b  =FromPDF.getInt(sb,sof,w[2]);  sof+=w[2];
					var off=0, gen=0, chr="n";
					if(typ==0) {off=a;  gen=b;  chr="f";}
					if(typ==1) {off=a;  gen=b;  chr="n";}
					if(typ==2) {off=a;  gen=b;  chr="s";}
					out[idx?tis[i]:i] = { off: off, gen: gen, chr: chr, val: null, opn: false };  i++;
				}
				if(xr["/Prev"]) FromPDF.readXrefTrail(buff, xr["/Prev"], out);
				if(xr["/Encrypt"]) return xr;
				//*
				var fl = {buff:buff, off:0};
				var ps = ["/Root","/Info"];
				for(var i=0; i<ps.length; i++) {
					var p = ps[i], val = xr[p];
					if(val && val.typ=="ref") xr[p] = FromPDF.getIndirect(val.ind, val.gen, fl, out);
				}
				return xr;
			}
			else return null;
		}
	}
	FromPDF.getInt = function(b,o,l) {
		if(l==0) return 0;
		if(l==1) return b[o];
		if(l==2) return ((b[o]<< 8)|b[o+1]);
		if(l==3) return ((b[o]<<16)|(b[o+1]<<8)|b[o+2]);
		if(l==4) return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3]);  
		while(l>4) {l--;  o++;}  
		return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3]);
	}
	
	FromPDF.getIndirect = function(i,g,file,xr)
	{
		var xv = xr[i];
		if(xv.chr=="f") return null;
		if(xv.val!=null) return xv.val;
		if(xv.opn) return {typ:"ref",ind:i, gen:g};
		
		xv.opn = true;
		var ooff = file.off, nval;
		
		if(xv.chr=="s") {
			var os = FromPDF.getIndirect(xv.off, xv.gen, file, xr), fle = {buff:FromPS.GS(os), off:0};
			var idx=0, ofs=0;
			while(idx!=i) {  idx=FromPS.getFToken(fle).val;  ofs=FromPS.getFToken(fle).val;  }
			fle.off = ofs+os["/First"];
			nval = FromPDF.readObject(fle, file, xr);
		}
		else {
			file.off = xv.off;
			//console.log(JSON.stringify(PUtils.readASCII(file.buff, file.off,16)));
			var a=FromPS.getFToken(file);
			if(a.val!="<<") { var b=FromPS.getFToken(file), c=FromPS.getFToken(file); }
			else file.off-=2;
			//while(file.buff[file.off]!=10) file.off++;  file.off++;
			//console.log(a,b,c);
			nval = FromPDF.readObject(file, file, xr);
		}
		
		xv.val = nval;
		file.off = ooff;  xv.opn = false;
		return nval;
	}
	
	FromPDF.readObject = function(file, mfile, xr) 
	{
		//console.log(file.off, file.buff);
		var tok = FromPS.getFToken(file);
		//console.log(tok);
		if(tok.typ=="integer") {
			var off = file.off;
			var tok2 = FromPS.getFToken(file);
			if(tok2 && tok2.typ=="integer") {
				FromPS.skipWhite(file);
				if(file.buff[file.off]==82) {
					file.off++;  
					if(xr && xr[tok.val]) return FromPDF.getIndirect(tok.val, tok2.val, mfile, xr);
					else   return {typ:"ref",ind:tok.val, gen:tok2.val};
				}
			}
			file.off = off;
		}
		
		if(tok.val=="<<") return FromPDF.readDict(file, mfile, xr);
		if(tok.val=="[" ) return FromPDF.readArra(file, mfile, xr);
		if(tok.typ=="string") {
			var s = "";  for(var i=0; i<tok.val.length; i++) s+=String.fromCharCode(tok.val[i]);
			return s;
		}
		if(tok.typ=="name" && tok.val==">>") throw "e";
		return tok.val;
	}
	FromPDF.readDict = function(file, mfile, xr) {
		var o = {};
		while(true) {
			var off=file.off, tok = FromPS.getFToken(file);
			if(tok.typ=="name" && tok.val==">>") break;
			file.off= off;
			var key = FromPDF.readObject(file, mfile, xr);
			var val = FromPDF.readObject(file, mfile, xr);
			o[key] = val;
		}
		if(o["/Length"]!=null && o["/CFM"]==null) {
			var l = o["/Length"];
			var tk = FromPS.getFToken(file);  if(file.buff[file.off]==13) file.off++;  if(file.buff[file.off]==10) file.off++;
			o["buff"] = file.buff.slice(file.off, file.off+l);  file.off += l;  FromPS.getFToken(file); // endstream
		}
		return o;
	}
	FromPDF.readArra = function(file, mfile, xr) {
		var o = [];
		while(true) {
			var off=file.off, tok = FromPS.getFToken(file);
			if(tok.typ=="name" && tok.val=="]") return o;
			file.off = off;
			var val = FromPDF.readObject(file, mfile, xr);
			o.push(val);
		}
	}
	
		
	
	
	
	function FromWMF ()
	{
	}
	
	FromWMF.Parse = function(buff, genv)
	{
		buff = new Uint8Array(buff);  var off=0;
		var prms = {fill:false, strk:false, bb:[0,0,1,1], lbb:[0,0,1,1], scl:1, fnt:{nam:"Arial",hgh:25,und:false,orn:0,chrst:0}, tclr:[0,0,0], talg:0};
		
		var rS = FromWMF.B.readShort, rU = FromWMF.B.readUshort, rU32 = FromWMF.B.readUint;
		
		var key = rU32(buff,0); 
		if(key==0x9AC6CDD7) {
			off = 6;
			var dpi = rS(buff, off+8);  prms.scl=120/dpi;
			for(var i=0; i<4; i++) {  prms.bb[i] = Math.round(rS(buff,off)*prms.scl);  off+=2;  }
			off+=2;
			//console.log(prms.bb, dpi);
			off += 6;
			//console.log(bb, dpi);
		}
		
		genv.StartPage(prms.bb[0],prms.bb[1],prms.bb[2],prms.bb[3]);
		
		
		
		var gst = UDOC.getState(prms.bb);
		
		var type = rU(buff, off);  off+=2;
		var hSiz = rU(buff, off);  off+=2;
		var vrsn = rU(buff, off);  off+=2;
		var size = rU32(buff, off);  off+=4;
		var nomb = rU(buff, off);  off+=2;
		var mRec = rU32(buff, off);  off+=4;
		var nomb = rU(buff, off);  off+=2;
		
		//console.log(type, hSiz, vrsn, size, nomb, mRec, nomb);
		
		//gst.colr= [0.8,0,0.8];     // purple fill color
		//gst.pth = {  cmds:["M","L","L","L","Z"], crds:[20,20,80,20,80,80,20,80]  };  // a square
		//genv.Fill(gst);
		//console.log(buff.slice(0,64));
		
		var tab = [];
		
		var opn=0;
		while(true) {
		
			var siz = rU32(buff, off)<<1;  off+=4;
			var fnc = rU  (buff, off);     off+=2;
			var fnm = FromWMF.K[fnc]; 
			var loff = off;
			
			//if(opn++==24) break;
			var obj = null;
			//console.log(fnm, siz);
			
			if(false) {}
			else if(fnm=="EOF") break;
			else if(fnm=="ESCAPE") {
				var esf = rU  (buff, off);     loff+=2;
				var fnm2 = FromWMF.K2[esf];
				console.log(fnm, fnm2);
			}
			else if(fnm=="SETMAPMODE" || fnm=="SETPOLYFILLMODE" || fnm=="SETBKMODE") {}
			else if(fnm=="SELECTOBJECT") {
				var ind = rU(buff, loff);  loff+=2;
				var co = tab[ind];  //console.log(co);
				if(co.t=="br") {
					prms.fill=co.stl!=1;
					if     (co.stl==0) {}
					else if(co.stl==1) {}
					else throw co.stl+" e";
					gst.colr=co.clr;
					//if(co.htc!=0) throw co.stl+" "+co.htc+" e";
				}
				else if(co.t=="pn") {
					var stl = (co.stl&7);
					prms.strk=stl!=5;
					if     (stl==0 || stl==6) gst.lwidth = co.px;
					else if(stl==5) {}
					else throw stl+" e";
					
					if((co.stl&0x1000)!=0) gst.ljoin=2;  // bevel 
					else if((co.stl&0x2000)!=0) gst.ljoin=0;  // miter
					else gst.ljoin = 1;  // round
					gst.COLR=co.clr;
				}
				else if(co.t=="fn") {
					prms.fnt = co;
					gst.font.Tf = co.nam;
					gst.font.Tfs = Math.abs(co.hgh);
					gst.font.Tun = co.und;
				}
				else throw "e";
			}
			else if(fnm=="DELETEOBJECT") {
				var ind = rU(buff, loff);  loff+=2;
				tab[ind]=null;
			}
			else if(fnm=="SETWINDOWORG" || fnm=="SETWINDOWEXT") {
				var coff = fnm=="SETWINDOWORG" ? 0 : 2;
				prms.lbb[coff+1] = rS(buff, loff);  loff+=2;
				prms.lbb[coff  ] = rS(buff, loff);  loff+=2;
				FromWMF._updateCtm(prms, gst);
			}
			else if(fnm=="CREATEBRUSHINDIRECT") {
				obj = {t:"br"};
				obj.stl = rU(buff, loff);  loff+=2;
				obj.clr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255];  loff+=4;
				obj.htc = rU(buff, loff);  loff+=2;
			}
			else if(fnm=="CREATEPENINDIRECT") {
				obj = {t:"pn"};
				obj.stl = rU(buff, loff);  loff+=2;
				obj.px  = rS(buff, loff);  loff+=2;  
				obj.py  = rS(buff, loff);  loff+=2;  //console.log(stl, px, py);
				obj.clr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255];  loff+=4;
			}
			else if(fnm=="CREATEFONTINDIRECT") {
				obj = {t:"fn", nam:""};
				//obj.stl = rU(buff, loff);  loff+=2;
				obj.hgh = rS(buff, loff);  loff += 2;
				loff += 2*2;
				obj.orn = rS(buff, loff)/10;  loff+=2;
				var wgh = rS(buff, loff);  loff+=2;  //console.log(wgh);
				obj.und = buff[loff+1];  loff += 2;
				obj.stk = buff[loff  ];  obj.chrst = buff[off+1];  loff += 2;  //console.log(obj.chrst);
				loff+=4;
				//console.log(PUtils.readASCII(buff, off, 200));
				while(buff[loff]!=0) {  obj.nam+=String.fromCharCode(buff[loff]);  loff++;  }
				if(wgh>500) obj.nam+="-Bold";
				//console.log(wgh, obj.nam);
				//console.log(obj);
			}
			else if(fnm=="CREATEPALETTE") {  obj = {t:"pl"};  }
			else if(fnm=="SETTEXTCOLOR") prms.tclr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255]; 
			else if(fnm=="SETTEXTALIGN") prms.talg = rU(buff, loff);
			else if(fnm=="MOVETO" ) {  UDOC.G.moveTo(gst, rS(buff,loff+2), rS(buff,loff));  }
			else if(fnm=="LINETO"   ) {  
				if(gst.pth.cmds.length==0) {  var im=gst.ctm.slice(0);  UDOC.M.invert(im);  var p = UDOC.M.multPoint(im, gst.cpos);  UDOC.G.moveTo(gst, p[0], p[1]);  }  
				UDOC.G.lineTo(gst, rS(buff,loff+2), rS(buff,loff));  var ofill=prms.fill;  prms.fill=false;  FromWMF._draw(genv, gst, prms);  prms.fill=ofill;
			}
			else if(fnm=="POLYPOLYGON") {
				var nop = rU(buff, loff);  loff+=2;
				var pi = loff;  loff+= nop*2;
				
				for(var i=0; i<nop; i++) {
					var ppp = rU(buff, pi+i*2);
					loff = FromWMF._drawPoly(buff,loff,ppp,gst, true);
				}
				FromWMF._draw(genv, gst, prms);
			}
			else if(fnm=="POLYGON" || fnm=="POLYLINE") {
				var ppp = rU(buff, loff);  loff+=2;
				loff = FromWMF._drawPoly(buff,loff,ppp,gst, fnm=="POLYGON");
				var ofill = prms.fill;  prms.fill = (ofill && fnm=="POLYGON");
				FromWMF._draw(genv, gst, prms);
				prms.fill = ofill;
			}
			else if(fnm=="RECTANGLE" || fnm=="ELLIPSE") {
				var y1 = rS(buff, loff);  loff+=2;
				var x1 = rS(buff, loff);  loff+=2;
				var y0 = rS(buff, loff);  loff+=2;
				var x0 = rS(buff, loff);  loff+=2;
				if(fnm=="RECTANGLE") {
					UDOC.G.moveTo(gst, x0,y0);  UDOC.G.lineTo(gst, x1,y0);  UDOC.G.lineTo(gst, x1,y1);  UDOC.G.lineTo(gst, x0,y1);
				} else {
					var x = (x0+x1)/2, y = (y0+y1)/2;
					UDOC.G.arc(gst,x,y,(y1-y0)/2,0,2*Math.PI, false);
				}
				UDOC.G.closePath(gst);
				var ofill = prms.fill;  prms.fill = true;
				FromWMF._draw(genv, gst, prms);
				prms.fill = ofill;
			}
			else if(fnm=="STRETCHDIB") {
				var rop = rU32(buff, loff);  loff+=4;
				var cu = rU(buff, loff);  loff+=2;
				var sh = rS(buff, loff);  loff+=2;
				var sw = rS(buff, loff);  loff+=2;
				var sy = rS(buff, loff);  loff+=2;
				var sx = rS(buff, loff);  loff+=2;
				var hD = rS(buff, loff);  loff+=2;
				var wD = rS(buff, loff);  loff+=2;
				var yD = rS(buff, loff);  loff+=2;
				var xD = rS(buff, loff);  loff+=2;
				//console.log(rop, cu, sx,sy,sw,sh,"-",dx,dy,dw,dh);
				var img = FromWMF._loadDIB(buff, loff);
				
				var ctm = gst.ctm.slice(0);
				gst.ctm = [1,0,0,1,0,0];
				UDOC.M.scale(gst.ctm, wD, -hD);
				UDOC.M.translate(gst.ctm, xD, yD+hD);
				UDOC.M.concat(gst.ctm, ctm);
				genv.PutImage(gst, img, sw, sh);
				gst.ctm = ctm;
			}
			else if(fnm=="EXTTEXTOUT") {
				var rfy = rS(buff, loff);  loff+=2;
				var rfx = rS(buff, loff);  loff+=2;
				
				gst.font.Tm = [1,0,0,-1,0,0];
				UDOC.M.rotate(gst.font.Tm, prms.fnt.orn*Math.PI/180);
				UDOC.M.translate(gst.font.Tm, rfx, rfy);
				
				var alg = prms.talg;
				if     ((alg&6)==6) gst.font.Tal = 2;
				else if((alg&7)==0) gst.font.Tal = 0;
				else throw alg+" e";
				if((alg&24)==24) {}  // baseline
				else if((alg&24)==0) UDOC.M.translate(gst.font.Tm, 0, gst.font.Tfs);
				else throw "e";
				
				var crs = rU(buff, loff);  loff+=2;
				var ops = rU(buff, loff);  loff+=2;  //if(ops!=0) throw "e";
				if(ops&4) loff+=8;
				
				//console.log(buff.slice(loff, loff+crs));
				var str = "";
				for(var i=0; i<crs; i++) {
					var cc = buff[loff+i];
					if(cc>127) {  i++;  cc=(cc<<8)|buff[loff+i];  }
					str+=String.fromCharCode(cc);  //console.log(gst.font.Tfs, str);
				}
				//console.log(str);
				//for(var i=0; i<crs; i++) str+=String.fromCharCode(rU(buff,loff+i*2));  //console.log(gst.font.Tfs, str);
				var oclr = gst.colr;  gst.colr = prms.tclr;
				genv.PutText(gst, str, str.length*gst.font.Tfs*0.5);  gst.colr=oclr;
			}
			else {
				console.log(fnm, siz);
			}
			
			if(obj!=null) {
				var li = 0;
				while(tab[li]!=null) li++;
				tab[li]=obj;
			}
			
			off+=siz-6;
		}
		
		genv.ShowPage();  genv.Done();
	}
	FromWMF._loadDIB = function(buff, off) {
		var rS = FromWMF.B.readShort, rU = FromWMF.B.readUshort, rU32 = FromWMF.B.readUint;
		
		var hsize = rU32(buff, off);  off+=4;
		
		var w, h, cu;
		if(hsize==0xc) throw "e";
		else {
			w = rU32(buff, off);  off+=4;
			h = rU32(buff, off);  off+=4;
			var ps = rU(buff, off);  off+=2;  if(ps!= 1) throw "e";
			var bc = rU(buff, off);  off+=2;  if(bc!=1 && bc!=24 && bc!=32) throw bc+" e";
			//console.log(w,h,ps,bc);
			
			var cmpr = rU32(buff, off);  off+=4;  if(cmpr!=0) throw "e";
			var size = rU32(buff, off);  off+=4;
			var xppm = rU32(buff, off);  off+=4;
			var yppm = rU32(buff, off);  off+=4;
			    cu = rU32(buff, off);  off+=4;   //if(cu!=0) throw cu+" e";  // number of colors used ... 0: all colors
			var ci = rU32(buff, off);  off+=4;
			//console.log(cmpr, size, xppm, yppm, cu, ci);
		}
		
		var area = w*h;
		var img = new Uint8Array(area*4);
		var rl = Math.floor(((w * ps * bc + 31) & ~31) / 8);
		if(bc==1 ) 
			for(var y=0; y<h; y++) {
				var j = off+cu*4+(h-1-y)*rl;
				for(var x=0; x<w; x++) {
					var qi = (y*w+x)<<2, ind = (buff[j+(x>>>3)]>>>(7-(x&7)))&1;
					img[qi  ] = buff[off+ind*4+2];
					img[qi+1] = buff[off+ind*4+1];
					img[qi+2] = buff[off+ind*4+0];
					img[qi+3] = 255;
				}
			}
		if(bc==24) {
			for(var y=0; y<h; y++) 
				for(var x=0; x<w; x++) {
					var qi = (y*w+x)<<2, ti=off+(h-1-y)*rl+x*3;
					img[qi  ] = buff[ti+2];
					img[qi+1] = buff[ti+1];
					img[qi+2] = buff[ti+0];
					img[qi+3] = 255;
				}
		}
		if(bc==32) {
			for(var y=0; y<h; y++) 
				for(var x=0; x<w; x++) {
					var qi = (y*w+x)<<2, ti=off+(h-1-y)*rl+x*4;
					img[qi  ] = buff[ti+2];
					img[qi+1] = buff[ti+1];
					img[qi+2] = buff[ti+0];
					img[qi+3] = buff[ti+3];
				}
		}
		return img;
	}
	
	
	FromWMF._updateCtm = function(prms, gst) {
		var mat = [1,0,0,1,0,0];
		var lbb = prms.lbb, bb = prms.bb;
		
		UDOC.M.translate(mat, -lbb[0],-lbb[1]);
		UDOC.M.scale(mat, 1/lbb[2], 1/lbb[3]);
		
		UDOC.M.scale(mat, bb[2]-bb[0],bb[3]-bb[1]);
		UDOC.M.translate(mat, bb[0],bb[1]);
		
		gst.ctm = mat;
	}
	FromWMF._draw = function(genv, gst, prms) {
		if(prms.fill                 ) genv.Fill  (gst, false);
		if(prms.strk && gst.lwidth!=0) genv.Stroke(gst, false);
		UDOC.G.newPath(gst);
	}
	FromWMF._drawPoly = function(buff, off, ppp, gst, cls) {
		var rS = FromWMF.B.readShort;
		for(var j=0; j<ppp; j++) {
			var px = rS(buff, off);  off+=2;  
			var py = rS(buff, off);  off+=2;
			if(j==0) UDOC.G.moveTo(gst,px,py);  else UDOC.G.lineTo(gst,px,py);
		}
		if(cls) UDOC.G.closePath(gst);
		return off;
	}
	
	FromWMF.B = {
		uint8 : new Uint8Array(4),
		readShort  : function(buff,p)  {  var u8=FromWMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  return FromWMF.B.int16 [0];  },
		readUshort : function(buff,p)  {  var u8=FromWMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  return FromWMF.B.uint16[0];  },
		readUint   : function(buff,p)  {  var u8=FromWMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  u8[2]=buff[p+2];  u8[3]=buff[p+3];  return FromWMF.B.uint32[0];  },
		//readUint   : function(buff,p)  {  return (buff[p]*(256*256*256)) + ((buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3]);  },
		readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    }
	}
	FromWMF.B.int16  = new Int16Array (FromWMF.B.uint8.buffer);
	FromWMF.B.uint16 = new Uint16Array(FromWMF.B.uint8.buffer);
	FromWMF.B.uint32 = new Uint32Array(FromWMF.B.uint8.buffer);
	
	
	FromWMF.C = {
		META_EOF : 0x0000,
		META_REALIZEPALETTE : 0x0035,
		META_SETPALENTRIES : 0x0037,
		META_SETBKMODE : 0x0102,
		META_SETMAPMODE : 0x0103,
		META_SETROP2 : 0x0104,
		META_SETRELABS : 0x0105,
		META_SETPOLYFILLMODE : 0x0106,
		META_SETSTRETCHBLTMODE : 0x0107,
		META_SETTEXTCHAREXTRA : 0x0108,
		META_RESTOREDC : 0x0127,
		META_RESIZEPALETTE : 0x0139,
		META_DIBCREATEPATTERNBRUSH : 0x0142,
		META_SETLAYOUT : 0x0149,
		META_SETBKCOLOR : 0x0201,
		META_SETTEXTCOLOR : 0x0209,
		META_OFFSETVIEWPORTORG : 0x0211,
		META_LINETO : 0x0213,
		META_MOVETO : 0x0214,
		META_OFFSETCLIPRGN : 0x0220,
		META_FILLREGION : 0x0228,
		META_SETMAPPERFLAGS : 0x0231,
		META_SELECTPALETTE : 0x0234,
		META_POLYGON : 0x0324,
		META_POLYLINE : 0x0325,
		META_SETTEXTJUSTIFICATION : 0x020A,
		META_SETWINDOWORG : 0x020B,
		META_SETWINDOWEXT : 0x020C,
		META_SETVIEWPORTORG : 0x020D,
		META_SETVIEWPORTEXT : 0x020E,
		META_OFFSETWINDOWORG : 0x020F,
		META_SCALEWINDOWEXT : 0x0410,
		META_SCALEVIEWPORTEXT : 0x0412,
		META_EXCLUDECLIPRECT : 0x0415,
		META_INTERSECTCLIPRECT : 0x0416,
		META_ELLIPSE : 0x0418,
		META_FLOODFILL : 0x0419,
		META_FRAMEREGION : 0x0429,
		META_ANIMATEPALETTE : 0x0436,
		META_TEXTOUT : 0x0521,
		META_POLYPOLYGON : 0x0538,
		META_EXTFLOODFILL : 0x0548,
		META_RECTANGLE : 0x041B,
		META_SETPIXEL : 0x041F,
		META_ROUNDRECT : 0x061C,
		META_PATBLT : 0x061D,
		META_SAVEDC : 0x001E,
		META_PIE : 0x081A,
		META_STRETCHBLT : 0x0B23,
		META_ESCAPE : 0x0626,
		META_INVERTREGION : 0x012A,
		META_PAINTREGION : 0x012B,
		META_SELECTCLIPREGION : 0x012C,
		META_SELECTOBJECT : 0x012D,
		META_SETTEXTALIGN : 0x012E,
		META_ARC : 0x0817,
		META_CHORD : 0x0830,
		META_BITBLT : 0x0922,
		META_EXTTEXTOUT : 0x0a32,
		META_SETDIBTODEV : 0x0d33,
		META_DIBBITBLT : 0x0940,
		META_DIBSTRETCHBLT : 0x0b41,
		META_STRETCHDIB : 0x0f43,
		META_DELETEOBJECT : 0x01f0,
		META_CREATEPALETTE : 0x00f7,
		META_CREATEPATTERNBRUSH : 0x01F9,
		META_CREATEPENINDIRECT : 0x02FA,
		META_CREATEFONTINDIRECT : 0x02FB,
		META_CREATEBRUSHINDIRECT : 0x02FC,
		META_CREATEREGION : 0x06FF
	};
	
	FromWMF.C2 = {
		NEWFRAME : 0x0001,
		ABORTDOC : 0x0002,
		NEXTBAND : 0x0003,
		SETCOLORTABLE : 0x0004,
		GETCOLORTABLE : 0x0005,
		FLUSHOUT : 0x0006,
		DRAFTMODE : 0x0007,
		QUERYESCSUPPORT : 0x0008,
		SETABORTPROC : 0x0009,
		STARTDOC : 0x000A,
		ENDDOC : 0x000B,
		GETPHYSPAGESIZE : 0x000C,
		GETPRINTINGOFFSET : 0x000D,
		GETSCALINGFACTOR : 0x000E,
		META_ESCAPE_ENHANCED_METAFILE : 0x000F,
		SETPENWIDTH : 0x0010,
		SETCOPYCOUNT : 0x0011,
		SETPAPERSOURCE : 0x0012,
		PASSTHROUGH : 0x0013,
		GETTECHNOLOGY : 0x0014,
		SETLINECAP : 0x0015,
		SETLINEJOIN : 0x0016,
		SETMITERLIMIT : 0x0017,
		BANDINFO : 0x0018,
		DRAWPATTERNRECT : 0x0019,
		GETVECTORPENSIZE : 0x001A,
		GETVECTORBRUSHSIZE : 0x001B,
		ENABLEDUPLEX : 0x001C,
		GETSETPAPERBINS : 0x001D,
		GETSETPRINTORIENT : 0x001E,
		ENUMPAPERBINS : 0x001F,
		SETDIBSCALING : 0x0020,
		EPSPRINTING : 0x0021,
		ENUMPAPERMETRICS : 0x0022,
		GETSETPAPERMETRICS : 0x0023,
		POSTSCRIPT_DATA : 0x0025,
		POSTSCRIPT_IGNORE : 0x0026,
		GETDEVICEUNITS : 0x002A,
		GETEXTENDEDTEXTMETRICS : 0x0100,
		GETPAIRKERNTABLE : 0x0102,
		EXTTEXTOUT : 0x0200,
		GETFACENAME : 0x0201,
		DOWNLOADFACE : 0x0202,
		METAFILE_DRIVER : 0x0801,
		QUERYDIBSUPPORT : 0x0C01,
		BEGIN_PATH : 0x1000,
		CLIP_TO_PATH : 0x1001,
		END_PATH : 0x1002,
		OPEN_CHANNEL : 0x100E,
		DOWNLOADHEADER : 0x100F,
		CLOSE_CHANNEL : 0x1010,
		POSTSCRIPT_PASSTHROUGH : 0x1013,
		ENCAPSULATED_POSTSCRIPT : 0x1014,
		POSTSCRIPT_IDENTIFY : 0x1015,
		POSTSCRIPT_INJECTION : 0x1016,
		CHECKJPEGFORMAT : 0x1017,
		CHECKPNGFORMAT : 0x1018,
		GET_PS_FEATURESETTING : 0x1019,
		MXDC_ESCAPE : 0x101A,
		SPCLPASSTHROUGH2 : 0x11D8
	} 
	FromWMF.K = [];
	FromWMF.K2= [];
	
	(function() {
		var inp, out, stt;
		inp = FromWMF.C;   out = FromWMF.K;   stt=5;
		for(var p in inp) out[inp[p]] = p.slice(stt);
		inp = FromWMF.C2;  out = FromWMF.K2;  stt=0;
		for(var p in inp) out[inp[p]] = p.slice(stt);
		//console.log(FromWMF.K, FromWMF.K2);
	}  )();
		
			
	
	
	
	function FromEMF ()
	{
	}
	
	FromEMF.Parse = function(buff, genv)
	{
		buff = new Uint8Array(buff);  var off=0;
		//console.log(buff.slice(0,32));
		var prms = {fill:false, strk:false, bb:[0,0,1,1], wbb:[0,0,1,1], fnt:{nam:"Arial",hgh:25,und:false,orn:0}, tclr:[0,0,0], talg:0}, gst, tab = [], sts=[];
		
		var rI = FromEMF.B.readShort, rU = FromEMF.B.readUshort, rI32 = FromEMF.B.readInt, rU32 = FromEMF.B.readUint, rF32 = FromEMF.B.readFloat;	
		
		var opn=0;
		while(true) {
			var fnc = rU32(buff, off);  off+=4;
			var fnm = FromEMF.K[fnc]; 
			var siz = rU32(buff, off);  off+=4;
			
			//if(gst && isNaN(gst.ctm[0])) throw "e";
			//console.log(fnc,fnm,siz);
			
			var loff = off;
			
			//if(opn++==253) break;
			var obj = null, oid = 0;
			//console.log(fnm, siz);
			
			if(false) {}
			else if(fnm=="EOF") {  break;  }
			else if(fnm=="HEADER") {
				prms.bb = FromEMF._readBox(buff,loff);   loff+=16;  //console.log(fnm, prms.bb);
				genv.StartPage(prms.bb[0],prms.bb[1],prms.bb[2],prms.bb[3]);
				gst = UDOC.getState(prms.bb);	
			}
			else if(fnm=="SAVEDC") sts.push(JSON.stringify(gst), JSON.stringify(prms));
			else if(fnm=="RESTOREDC") {
				var dif = rI32(buff, loff);  loff+=4;
				while(dif<-1) {  sts.pop();  sts.pop();  }
				prms = JSON.parse(sts.pop());  gst = JSON.parse(sts.pop());
			}
			else if(fnm=="SELECTCLIPPATH") {  gst.cpth = JSON.parse(JSON.stringify(gst.pth));  }
			else if(["SETMAPMODE","SETPOLYFILLMODE","SETBKMODE"/*,"SETVIEWPORTEXTEX"*/,"SETICMMODE","SETROP2","EXTSELECTCLIPRGN"].indexOf(fnm)!=-1) {}
			//else if(fnm=="INTERSECTCLIPRECT") {  var r=prms.crct=FromEMF._readBox(buff, loff);  /*var y0=r[1],y1=r[3]; if(y0>y1){r[1]=y1; r[3]=y0;}*/ console.log(prms.crct);  }
			else if(fnm=="SETMITERLIMIT") gst.mlimit = rU32(buff, loff);
			else if(fnm=="SETTEXTCOLOR") prms.tclr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255]; 
			else if(fnm=="SETTEXTALIGN") prms.talg = rU32(buff, loff);
			else if(fnm=="SETVIEWPORTEXTEX" || fnm=="SETVIEWPORTORGEX") {
				if(prms.vbb==null) prms.vbb=[];
				var coff = fnm=="SETVIEWPORTORGEX" ? 0 : 2;
				prms.vbb[coff  ] = rI32(buff, loff);  loff+=4;
				prms.vbb[coff+1] = rI32(buff, loff);  loff+=4;
				//console.log(prms.vbb);
				if(fnm=="SETVIEWPORTEXTEX") FromEMF._updateCtm(prms, gst);
			}
			else if(fnm=="SETWINDOWEXTEX" || fnm=="SETWINDOWORGEX") {
				var coff = fnm=="SETWINDOWORGEX" ? 0 : 2;
				prms.wbb[coff  ] = rI32(buff, loff);  loff+=4;
				prms.wbb[coff+1] = rI32(buff, loff);  loff+=4;
				if(fnm=="SETWINDOWEXTEX") FromEMF._updateCtm(prms, gst);
			}
			//else if(fnm=="SETMETARGN") {}
			else if(fnm=="COMMENT") {  var ds = rU32(buff, loff);  loff+=4;  }
			
			else if(fnm=="SELECTOBJECT") {
				var ind = rU32(buff, loff);  loff+=4;
				//console.log(ind.toString(16), tab, tab[ind]);
				if     (ind==0x80000000) {  prms.fill=true ;  gst.colr=[1,1,1];  } // white brush
				else if(ind==0x80000005) {  prms.fill=false;  } // null brush
				else if(ind==0x80000007) {  prms.strk=true ;  prms.lwidth=1;  gst.COLR=[0,0,0];  } // black pen
				else if(ind==0x80000008) {  prms.strk=false;  } // null  pen
				else if(ind==0x8000000d) {} // system font
				else if(ind==0x8000000e) {}  // device default font
				else {
					var co = tab[ind];  //console.log(ind, co);
					if(co.t=="b") {
						prms.fill=co.stl!=1;
						if     (co.stl==0) {}
						else if(co.stl==1) {}
						else throw co.stl+" e";
						gst.colr=co.clr;
					}
					else if(co.t=="p") {
						prms.strk=co.stl!=5;
						gst.lwidth = co.wid;
						gst.COLR=co.clr;
					}
					else if(co.t=="f") {
						prms.fnt = co;
						gst.font.Tf = co.nam;
						gst.font.Tfs = Math.abs(co.hgh);
						gst.font.Tun = co.und;
					}
					else throw "e";
				}
			}
			else if(fnm=="DELETEOBJECT") {
				var ind = rU32(buff, loff);  loff+=4;
				if(tab[ind]!=null) tab[ind]=null;
				else throw "e";
			}
			else if(fnm=="CREATEBRUSHINDIRECT") {
				oid = rU32(buff, loff);  loff+=4;
				obj = {t:"b"};
				obj.stl = rU32(buff, loff);  loff+=4;
				obj.clr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255];  loff+=4;
				obj.htc = rU32(buff, loff);  loff+=4;
				//console.log(oid, obj);
			}
			else if(fnm=="CREATEPEN" || fnm=="EXTCREATEPEN") {
				oid = rU32(buff, loff);  loff+=4;
				obj = {t:"p"};
				if(fnm=="EXTCREATEPEN") {
					loff+=16;
					obj.stl = rU32(buff, loff);  loff+=4;
					obj.wid = rU32(buff, loff);  loff+=4;
					//obj.stl = rU32(buff, loff);  
					loff+=4;
				} else {
					obj.stl = rU32(buff, loff);  loff+=4;
					obj.wid = rU32(buff, loff);  loff+=4;  loff+=4;
				}
				obj.clr = [buff[loff]/255, buff[loff+1]/255, buff[loff+2]/255];  loff+=4;
			}
			else if(fnm=="EXTCREATEFONTINDIRECTW") {
				oid = rU32(buff, loff);  loff+=4;
				obj = {t:"f", nam:""};
				obj.hgh = rI32(buff, loff);  loff += 4;
				loff += 4*2;
				obj.orn = rI32(buff, loff)/10;  loff+=4;
				var wgh = rU32(buff, loff);  loff+=4;  //console.log(fnm, obj.orn, wgh);
				//console.log(rU32(buff,loff), rU32(buff,loff+4), buff.slice(loff,loff+8));
				obj.und = buff[loff+1];  obj.stk = buff[loff+2];  loff += 4*2;
				while(rU(buff,loff)!=0) {  obj.nam+=String.fromCharCode(rU(buff,loff));  loff+=2;  }
				if(wgh>500) obj.nam+="-Bold";
				//console.log(wgh, obj.nam);
			}
			else if(fnm=="EXTTEXTOUTW") {
				//console.log(buff.slice(loff-8, loff-8+siz));
				loff+=16;
				var mod = rU32(buff, loff);  loff+=4;  //console.log(mod);
				var scx = rF32(buff, loff);  loff+=4;
				var scy = rF32(buff, loff);  loff+=4;
				var rfx = rI32(buff, loff);  loff+=4;
				var rfy = rI32(buff, loff);  loff+=4;
				//console.log(mod, scx, scy,rfx,rfy);
				
				gst.font.Tm = [1,0,0,-1,0,0];
				UDOC.M.rotate(gst.font.Tm, prms.fnt.orn*Math.PI/180);
				UDOC.M.translate(gst.font.Tm, rfx, rfy);
				
				var alg = prms.talg;  //console.log(alg.toString(2));
				if     ((alg&6)==6) gst.font.Tal = 2;
				else if((alg&7)==0) gst.font.Tal = 0;
				else throw alg+" e";
				if((alg&24)==24) {}  // baseline
				else if((alg&24)==0) UDOC.M.translate(gst.font.Tm, 0, gst.font.Tfs);
				else throw "e";
				
				
				var crs = rU32(buff, loff);  loff+=4;
				var ofs = rU32(buff, loff);  loff+=4;
				var ops = rU32(buff, loff);  loff+=4;  //if(ops!=0) throw "e";
				//console.log(ofs,ops,crs);
				loff+=16;
				var ofD = rU32(buff, loff);  loff+=4;  //console.log(ops, ofD, loff, ofs+off-8);
				ofs += off-8;  //console.log(crs, ops);
				var str = "";
				for(var i=0; i<crs; i++) {  var cc=rU(buff,ofs+i*2);  str+=String.fromCharCode(cc);  };
				var oclr = gst.colr;  gst.colr = prms.tclr;
				//console.log(str, gst.colr, gst.font.Tm);
				//var otfs = gst.font.Tfs;  gst.font.Tfs *= 1/gst.ctm[0];
				genv.PutText(gst, str, str.length*gst.font.Tfs*0.5);  gst.colr=oclr;
				//gst.font.Tfs = otfs;
				//console.log(rfx, rfy, scx, ops, rcX, rcY, rcW, rcH, offDx, str);
			}
			else if(fnm=="BEGINPATH") {  UDOC.G.newPath(gst);  }
			else if(fnm=="ENDPATH"  ) {    }
			else if(fnm=="CLOSEFIGURE") UDOC.G.closePath(gst);
			else if(fnm=="MOVETOEX" ) {  UDOC.G.moveTo(gst, rI32(buff,loff), rI32(buff,loff+4));  }
			else if(fnm=="LINETO"   ) {  
				if(gst.pth.cmds.length==0) {  var im=gst.ctm.slice(0);  UDOC.M.invert(im);  var p = UDOC.M.multPoint(im, gst.cpos);  UDOC.G.moveTo(gst, p[0], p[1]);  }  
				UDOC.G.lineTo(gst, rI32(buff,loff), rI32(buff,loff+4));  }
			else if(fnm=="POLYGON" || fnm=="POLYGON16" || fnm=="POLYLINE" || fnm=="POLYLINE16" || fnm=="POLYLINETO" || fnm=="POLYLINETO16") {
				loff+=16;
				var ndf = fnm.startsWith("POLYGON"), isTo = fnm.indexOf("TO")!=-1;
				var cnt = rU32(buff, loff);  loff+=4;
				if(!isTo) UDOC.G.newPath(gst);
				loff = FromEMF._drawPoly(buff,loff,cnt,gst, fnm.endsWith("16")?2:4,  ndf, isTo);
				if(!isTo) FromEMF._draw(genv,gst,prms, ndf);
				//console.log(prms, gst.lwidth);
				//console.log(JSON.parse(JSON.stringify(gst.pth)));
			}
			else if(fnm=="POLYPOLYGON16") {
				loff+=16;
				var ndf = fnm.startsWith("POLYPOLYGON"), isTo = fnm.indexOf("TO")!=-1;
				var nop = rU32(buff, loff);  loff+=4;  loff+=4;
				var pi = loff;  loff+= nop*4;
				
				if(!isTo) UDOC.G.newPath(gst);
				for(var i=0; i<nop; i++) {
					var ppp = rU(buff, pi+i*4);
					loff = FromEMF._drawPoly(buff,loff,ppp,gst, fnm.endsWith("16")?2:4, ndf, isTo);
				}
				if(!isTo) FromEMF._draw(genv,gst,prms, ndf);
			}
			else if(fnm=="POLYBEZIER" || fnm=="POLYBEZIER16" || fnm=="POLYBEZIERTO" || fnm=="POLYBEZIERTO16") {
				loff+=16;
				var is16 = fnm.endsWith("16"), rC = is16?rI:rI32, nl = is16?2:4;
				var cnt = rU32(buff, loff);  loff+=4;
				if(fnm.indexOf("TO")==-1) {
					UDOC.G.moveTo(gst, rC(buff,loff), rC(buff,loff+nl));  loff+=2*nl;  cnt--;
				}
				while(cnt>0) {
					UDOC.G.curveTo(gst, rC(buff,loff), rC(buff,loff+nl), rC(buff,loff+2*nl), rC(buff,loff+3*nl), rC(buff,loff+4*nl), rC(buff,loff+5*nl) );
					loff+=6*nl;
					cnt-=3;
				}
				//console.log(JSON.parse(JSON.stringify(gst.pth)));
			}
			else if(fnm=="RECTANGLE" || fnm=="ELLIPSE") {
				UDOC.G.newPath(gst);
				var bx = FromEMF._readBox(buff, loff);
				if(fnm=="RECTANGLE") {
					UDOC.G.moveTo(gst, bx[0],bx[1]);
					UDOC.G.lineTo(gst, bx[2],bx[1]);
					UDOC.G.lineTo(gst, bx[2],bx[3]);
					UDOC.G.lineTo(gst, bx[0],bx[3]);
				}
				else {
					var x = (bx[0]+bx[2])/2, y = (bx[1]+bx[3])/2;
					UDOC.G.arc(gst,x,y,(bx[2]-bx[0])/2,0,2*Math.PI, false);
				}
				UDOC.G.closePath(gst);
				FromEMF._draw(genv,gst,prms, true);
				//console.log(prms, gst.lwidth);
			}
			else if(fnm=="FILLPATH"  ) genv.Fill(gst, false);
			else if(fnm=="STROKEPATH") genv.Stroke(gst);
			else if(fnm=="STROKEANDFILLPATH") {  genv.Fill(gst, false);  genv.Stroke(gst);  }
			else if(fnm=="SETWORLDTRANSFORM" || fnm=="MODIFYWORLDTRANSFORM") {
				var mat = [];
				for(var i=0; i<6; i++) mat.push(rF32(buff,loff+i*4));  loff+=24;
				//console.log(fnm, gst.ctm.slice(0), mat);
				if(fnm=="SETWORLDTRANSFORM") gst.ctm=mat;
				else {
					var mod = rU32(buff,loff);  loff+=4;
					if(mod==2) {  var om=gst.ctm;  gst.ctm=mat;  UDOC.M.concat(gst.ctm, om);  }
					else throw "e";
				}
			}
			else if(fnm=="SETSTRETCHBLTMODE") {  var sm = rU32(buff, loff);  loff+=4;  }
			else if(fnm=="STRETCHDIBITS") {
				var bx = FromEMF._readBox(buff, loff);  loff+=16;
				var xD = rI32(buff, loff);  loff+=4;
				var yD = rI32(buff, loff);  loff+=4;
				var xS = rI32(buff, loff);  loff+=4;
				var yS = rI32(buff, loff);  loff+=4;
				var wS = rI32(buff, loff);  loff+=4;
				var hS = rI32(buff, loff);  loff+=4;
				var ofH = rU32(buff, loff)+off-8;  loff+=4;
				var szH = rU32(buff, loff);  loff+=4;
				var ofB = rU32(buff, loff)+off-8;  loff+=4;
				var szB = rU32(buff, loff);  loff+=4;
				var usg = rU32(buff, loff);  loff+=4;  if(usg!=0) throw "e";
				var bop = rU32(buff, loff);  loff+=4;
				var wD = rI32(buff, loff);  loff+=4;
				var hD = rI32(buff, loff);  loff+=4;  //console.log(bop, wD, hD);
				
				//console.log(ofH, szH, ofB, szB, ofH+40);
				//console.log(bx, xD,yD,wD,hD);
				//console.log(xS,yS,wS,hS);
				//console.log(ofH,szH,ofB,szB,usg,bop);
				
				var hl = rU32(buff, ofH);  ofH+=4;
				var w  = rU32(buff, ofH);  ofH+=4;
				var h  = rU32(buff, ofH);  ofH+=4;  if(w!=wS || h!=hS) throw "e";
				var ps = rU  (buff, ofH);  ofH+=2;
				var bc = rU  (buff, ofH);  ofH+=2;  if(bc!=8 && bc!=24 && bc!=32) throw bc+" e";
				var cpr= rU32(buff, ofH);  ofH+=4;  if(cpr!=0) throw cpr+" e";
				var sz = rU32(buff, ofH);  ofH+=4;
				var xpm= rU32(buff, ofH);  ofH+=4;
				var ypm= rU32(buff, ofH);  ofH+=4;
				var cu = rU32(buff, ofH);  ofH+=4;
				var ci = rU32(buff, ofH);  ofH+=4;  //console.log(hl, w, h, ps, bc, cpr, sz, xpm, ypm, cu, ci);
				
				//console.log(hl,w,h,",",xS,yS,wS,hS,",",xD,yD,wD,hD,",",xpm,ypm);
				
				var rl = Math.floor(((w * ps * bc + 31) & ~31) / 8);
				var img = new Uint8Array(w*h*4);
				if(bc==8) {
					for(var y=0; y<h; y++) 
						for(var x=0; x<w; x++) {
							var qi = (y*w+x)<<2, ind = buff[ofB+(h-1-y)*rl+x]<<2;
							img[qi  ] = buff[ofH+ind+2];
							img[qi+1] = buff[ofH+ind+1];
							img[qi+2] = buff[ofH+ind+0];
							img[qi+3] = 255;
						}
				}
				if(bc==24) {
					for(var y=0; y<h; y++) 
						for(var x=0; x<w; x++) {
							var qi = (y*w+x)<<2, ti=ofB+(h-1-y)*rl+x*3;
							img[qi  ] = buff[ti+2];
							img[qi+1] = buff[ti+1];
							img[qi+2] = buff[ti+0];
							img[qi+3] = 255;
						}
				}
				if(bc==32) {
					for(var y=0; y<h; y++) 
						for(var x=0; x<w; x++) {
							var qi = (y*w+x)<<2, ti=ofB+(h-1-y)*rl+x*4;
							img[qi  ] = buff[ti+2];
							img[qi+1] = buff[ti+1];
							img[qi+2] = buff[ti+0];
							img[qi+3] = buff[ti+3];
						}
				}
				
				var ctm = gst.ctm.slice(0);
				gst.ctm = [1,0,0,1,0,0];
				UDOC.M.scale(gst.ctm, wD, -hD);
				UDOC.M.translate(gst.ctm, xD, yD+hD);
				UDOC.M.concat(gst.ctm, ctm);
				genv.PutImage(gst, img, w, h);
				gst.ctm = ctm;
			}
			else {
				console.log(fnm, siz);
			}
			
			if(obj!=null) tab[oid]=obj;
			
			off+=siz-8;
		}
		//genv.Stroke(gst);
		genv.ShowPage();  genv.Done();
	}
	FromEMF._readBox = function(buff, off) {  var b=[];  for(var i=0; i<4; i++) b[i] = FromEMF.B.readInt(buff,off+i*4);  return b;  }	
	
	FromEMF._updateCtm = function(prms, gst) {
		var mat = [1,0,0,1,0,0];
		var wbb = prms.wbb, bb = prms.bb, vbb=(prms.vbb && prms.vbb.length==4) ? prms.vbb:prms.bb;
		
		//var y0 = bb[1], y1 = bb[3];  bb[1]=Math.min(y0,y1);  bb[3]=Math.max(y0,y1);
		
		UDOC.M.translate(mat, -wbb[0],-wbb[1]);
		UDOC.M.scale(mat, 1/wbb[2], 1/wbb[3]);
		
		UDOC.M.scale(mat, vbb[2], vbb[3]);
		//UDOC.M.scale(mat, vbb[2]/(bb[2]-bb[0]), vbb[3]/(bb[3]-bb[1]));
		
		//UDOC.M.scale(mat, bb[2]-bb[0],bb[3]-bb[1]);
		
		gst.ctm = mat;
	}
	FromEMF._draw = function(genv, gst, prms, needFill) {
		if(prms.fill && needFill     ) genv.Fill  (gst, false);
		if(prms.strk && gst.lwidth!=0) genv.Stroke(gst);
	}
	FromEMF._drawPoly = function(buff, off, ppp, gst, nl, clos, justLine) {
		var rS = nl==2 ? FromEMF.B.readShort : FromEMF.B.readInt;
		for(var j=0; j<ppp; j++) {
			var px = rS(buff, off);  off+=nl;  
			var py = rS(buff, off);  off+=nl;
			if(j==0 && !justLine) UDOC.G.moveTo(gst,px,py);  else UDOC.G.lineTo(gst,px,py);
		}
		if(clos) UDOC.G.closePath(gst);
		return off;
	}
	
	FromEMF.B = {
		uint8 : new Uint8Array(4),
		readShort  : function(buff,p)  {  var u8=FromEMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  return FromEMF.B.int16 [0];  },
		readUshort : function(buff,p)  {  var u8=FromEMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  return FromEMF.B.uint16[0];  },
		readInt    : function(buff,p)  {  var u8=FromEMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  u8[2]=buff[p+2];  u8[3]=buff[p+3];  return FromEMF.B.int32 [0];  },
		readUint   : function(buff,p)  {  var u8=FromEMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  u8[2]=buff[p+2];  u8[3]=buff[p+3];  return FromEMF.B.uint32[0];  },
		readFloat  : function(buff,p)  {  var u8=FromEMF.B.uint8;  u8[0]=buff[p];  u8[1]=buff[p+1];  u8[2]=buff[p+2];  u8[3]=buff[p+3];  return FromEMF.B.flot32[0];  },
		readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    }
	}
	FromEMF.B.int16  = new Int16Array (FromEMF.B.uint8.buffer);
	FromEMF.B.uint16 = new Uint16Array(FromEMF.B.uint8.buffer);
	FromEMF.B.int32  = new Int32Array (FromEMF.B.uint8.buffer);
	FromEMF.B.uint32 = new Uint32Array(FromEMF.B.uint8.buffer);
	FromEMF.B.flot32 = new Float32Array(FromEMF.B.uint8.buffer);
	
	
	FromEMF.C = {
		EMR_HEADER : 0x00000001,
		EMR_POLYBEZIER : 0x00000002,
		EMR_POLYGON : 0x00000003,
		EMR_POLYLINE : 0x00000004,
		EMR_POLYBEZIERTO : 0x00000005,
		EMR_POLYLINETO : 0x00000006,
		EMR_POLYPOLYLINE : 0x00000007,
		EMR_POLYPOLYGON : 0x00000008,
		EMR_SETWINDOWEXTEX : 0x00000009,
		EMR_SETWINDOWORGEX : 0x0000000A,
		EMR_SETVIEWPORTEXTEX : 0x0000000B,
		EMR_SETVIEWPORTORGEX : 0x0000000C,
		EMR_SETBRUSHORGEX : 0x0000000D,
		EMR_EOF : 0x0000000E,
		EMR_SETPIXELV : 0x0000000F,
		EMR_SETMAPPERFLAGS : 0x00000010,
		EMR_SETMAPMODE : 0x00000011,
		EMR_SETBKMODE : 0x00000012,
		EMR_SETPOLYFILLMODE : 0x00000013,
		EMR_SETROP2 : 0x00000014,
		EMR_SETSTRETCHBLTMODE : 0x00000015,
		EMR_SETTEXTALIGN : 0x00000016,
		EMR_SETCOLORADJUSTMENT : 0x00000017,
		EMR_SETTEXTCOLOR : 0x00000018,
		EMR_SETBKCOLOR : 0x00000019,
		EMR_OFFSETCLIPRGN : 0x0000001A,
		EMR_MOVETOEX : 0x0000001B,
		EMR_SETMETARGN : 0x0000001C,
		EMR_EXCLUDECLIPRECT : 0x0000001D,
		EMR_INTERSECTCLIPRECT : 0x0000001E,
		EMR_SCALEVIEWPORTEXTEX : 0x0000001F,
		EMR_SCALEWINDOWEXTEX : 0x00000020,
		EMR_SAVEDC : 0x00000021,
		EMR_RESTOREDC : 0x00000022,
		EMR_SETWORLDTRANSFORM : 0x00000023,
		EMR_MODIFYWORLDTRANSFORM : 0x00000024,
		EMR_SELECTOBJECT : 0x00000025,
		EMR_CREATEPEN : 0x00000026,
		EMR_CREATEBRUSHINDIRECT : 0x00000027,
		EMR_DELETEOBJECT : 0x00000028,
		EMR_ANGLEARC : 0x00000029,
		EMR_ELLIPSE : 0x0000002A,
		EMR_RECTANGLE : 0x0000002B,
		EMR_ROUNDRECT : 0x0000002C,
		EMR_ARC : 0x0000002D,
		EMR_CHORD : 0x0000002E,
		EMR_PIE : 0x0000002F,
		EMR_SELECTPALETTE : 0x00000030,
		EMR_CREATEPALETTE : 0x00000031,
		EMR_SETPALETTEENTRIES : 0x00000032,
		EMR_RESIZEPALETTE : 0x00000033,
		EMR_REALIZEPALETTE : 0x00000034,
		EMR_EXTFLOODFILL : 0x00000035,
		EMR_LINETO : 0x00000036,
		EMR_ARCTO : 0x00000037,
		EMR_POLYDRAW : 0x00000038,
		EMR_SETARCDIRECTION : 0x00000039,
		EMR_SETMITERLIMIT : 0x0000003A,
		EMR_BEGINPATH : 0x0000003B,
		EMR_ENDPATH : 0x0000003C,
		EMR_CLOSEFIGURE : 0x0000003D,
		EMR_FILLPATH : 0x0000003E,
		EMR_STROKEANDFILLPATH : 0x0000003F,
		EMR_STROKEPATH : 0x00000040,
		EMR_FLATTENPATH : 0x00000041,
		EMR_WIDENPATH : 0x00000042,
		EMR_SELECTCLIPPATH : 0x00000043,
		EMR_ABORTPATH : 0x00000044,
		EMR_COMMENT : 0x00000046,
		EMR_FILLRGN : 0x00000047,
		EMR_FRAMERGN : 0x00000048,
		EMR_INVERTRGN : 0x00000049,
		EMR_PAINTRGN : 0x0000004A,
		EMR_EXTSELECTCLIPRGN : 0x0000004B,
		EMR_BITBLT : 0x0000004C,
		EMR_STRETCHBLT : 0x0000004D,
		EMR_MASKBLT : 0x0000004E,
		EMR_PLGBLT : 0x0000004F,
		EMR_SETDIBITSTODEVICE : 0x00000050,
		EMR_STRETCHDIBITS : 0x00000051,
		EMR_EXTCREATEFONTINDIRECTW : 0x00000052,
		EMR_EXTTEXTOUTA : 0x00000053,
		EMR_EXTTEXTOUTW : 0x00000054,
		EMR_POLYBEZIER16 : 0x00000055,
		EMR_POLYGON16 : 0x00000056,
		EMR_POLYLINE16 : 0x00000057,
		EMR_POLYBEZIERTO16 : 0x00000058,
		EMR_POLYLINETO16 : 0x00000059,
		EMR_POLYPOLYLINE16 : 0x0000005A,
		EMR_POLYPOLYGON16 : 0x0000005B,
		EMR_POLYDRAW16 : 0x0000005C,
		EMR_CREATEMONOBRUSH : 0x0000005D,
		EMR_CREATEDIBPATTERNBRUSHPT : 0x0000005E,
		EMR_EXTCREATEPEN : 0x0000005F,
		EMR_POLYTEXTOUTA : 0x00000060,
		EMR_POLYTEXTOUTW : 0x00000061,
		EMR_SETICMMODE : 0x00000062,
		EMR_CREATECOLORSPACE : 0x00000063,
		EMR_SETCOLORSPACE : 0x00000064,
		EMR_DELETECOLORSPACE : 0x00000065,
		EMR_GLSRECORD : 0x00000066,
		EMR_GLSBOUNDEDRECORD : 0x00000067,
		EMR_PIXELFORMAT : 0x00000068,
		EMR_DRAWESCAPE : 0x00000069,
		EMR_EXTESCAPE : 0x0000006A,
		EMR_SMALLTEXTOUT : 0x0000006C,
		EMR_FORCEUFIMAPPING : 0x0000006D,
		EMR_NAMEDESCAPE : 0x0000006E,
		EMR_COLORCORRECTPALETTE : 0x0000006F,
		EMR_SETICMPROFILEA : 0x00000070,
		EMR_SETICMPROFILEW : 0x00000071,
		EMR_ALPHABLEND : 0x00000072,
		EMR_SETLAYOUT : 0x00000073,
		EMR_TRANSPARENTBLT : 0x00000074,
		EMR_GRADIENTFILL : 0x00000076,
		EMR_SETLINKEDUFIS : 0x00000077,
		EMR_SETTEXTJUSTIFICATION : 0x00000078,
		EMR_COLORMATCHTOTARGETW : 0x00000079,
		EMR_CREATECOLORSPACEW : 0x0000007A
	};
	FromEMF.K = [];
	
	(function() {
		var inp, out, stt;
		inp = FromEMF.C;   out = FromEMF.K;   stt=4;
		for(var p in inp) out[inp[p]] = p.slice(stt);
	}  )();
	

	function ToPDF()
	{
		this._res = {  
			"/Font": {},
			"/XObject":{},
			"/ExtGState":{},
			"/Pattern":{}
		};
		this._xr = [
			null, 
			{ "/Type":"/Catalog", "/Pages":{typ:"ref",ind:2}},
			{ "/Type":"/Pages",   "/Kids" :[  ], "/Count":0 },
			this._res
		];
		this._bnds = [];
		this._cont = "";
		this._gst = ToPDF.defState();
	}
	
	ToPDF.defState = function() {
		return {"colr":"[0,0,0]", "COLR":"[0,0,0]", "lcap":"0","ljoin":"0", "lwidth":"1", "mlimit":"10", "dash":"[]","doff":"0", "bmode":"/Normal","CA":"1","ca":"1"}
	}
	
	ToPDF.prototype.StartPage = function(x0,y0,x1,y1) {  this._bnds = [x0,y0,x1,y1] ; }
	
	ToPDF.prototype.Stroke = function(gst) {
		if(gst.CA==0) return;
		this.setGState(gst, true);
		this._cont += " S\n";
	}
	ToPDF.prototype.Fill = function(gst, evenOdd)
	{
		if(gst.ca==0) return;
		this.setGState(gst, true);
		this._cont += " f\n";
	}
	
	ToPDF._flt   = function(n)  {  return ""+parseFloat(n.toFixed(2));  }
	ToPDF._fltc  = function(n)  {  return ""+parseFloat(n.toFixed(3));  }
	ToPDF._scale = function(m)  {  return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]));  };
	ToPDF._mat   = function(m){  var ms = m.map(ToPDF._flt).join(" ");  
		if(ms=="1 0 0 1 0 0") return "";  return ms+" cm ";  }
	ToPDF._eq    = function(a,b){  if(a.length!=b.length) return false;
		for(var i=0; i<a.length; i++) if(a[i]!=b[i]) return false;
		return true;
	}
	ToPDF._format = function(b) {
		var pfx = [ [0xff, 0xd8, 0xff      ], // "jpg";	
		[0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20], // JPX	
		[0x00, 0x00, 0x00, 0x00, 0x30, 0x00, 0x01, 0x00] ] // JBIG2
		var fmt = ["/DCTDecode", "/JPXDecode", "/JBIG2Decode"];
		for(var i=0; i<pfx.length; i++){
			var pf = pfx[i], good = true;
			for(var j=0; j<pf.length; j++) good = good && (b[j]==pf[j]);
			if(good) return fmt[i];
		}
	}
	
	ToPDF.prototype.setGState = function(gst, withPath) {
		var ost = this._gst, nst = {};
		for(var p in gst)  nst[p] = (typeof gst[p]=="string") ? gst[p] : JSON.stringify(gst[p]);
		var scl = ToPDF._scale(gst.ctm);
		var dsh = gst.dash.slice(0);  for(var i=0; i<dsh.length; i++) dsh[i] = ToPDF._flt(dsh[i]*scl);
		
		var cnt = this._cont;
		if(ost.lcap !=nst.lcap   ) cnt += gst.lcap + " J ";
		if(ost.ljoin!=nst.ljoin  ) cnt += gst.ljoin + " j ";
		if(ost.lwidth!=nst.lwidth) cnt += ToPDF._flt(gst.lwidth*scl) + " w ";
		if(ost.mlimit!=nst.mlimit) cnt += ToPDF._flt(gst.mlimit) + " M ";
		if(ost.dash!=nst.dash || ost.doff!=nst.doff) cnt += "["+dsh.join(" ")+"] "+gst.doff+" d ";
		if(ost.COLR !=nst.COLR   ) cnt += gst.COLR.map(ToPDF._fltc).join(" ") + " RG ";
		if(ost.colr !=nst.colr   ) {
			if(gst.colr.length!=null) cnt += gst.colr .map(ToPDF._fltc).join(" ") + " rg \n";
			else {
				var ps = this._res["/Pattern"], grd = gst.colr;
				var pi = "/P"+(ToPDF.maxI(ps)+1);
				var sh = {
					"/ShadingType":(grd.typ=="lin"?2:3),
					"/ColorSpace":"/DeviceRGB",
					"/Extend":[true, true],
					"/Function" : ToPDF._makeGrad(grd.grad),
					"/Coords" : grd.crds
				};
				ps[pi] = {
					"/Type":"/Pattern",
					"/PatternType":2,
					"/Matrix":grd.mat,
					"/Shading":sh
				}
				cnt += "/Pattern cs "+pi+" scn ";
			}
		}
		var eg = this._res["/ExtGState"];
		if(ost.bmode!=nst.bmode  ) {
			var sname = nst.bmode;
			if(eg[sname]==null) eg[sname] = {"/Type":"/ExtGState", "/BM":gst.bmode};
			cnt += sname + " gs ";
		}
		if(ost.CA!=nst.CA) {
			var sname = "/Alpha"+Math.round(255*nst.CA);
			if(eg[sname]==null) eg[sname] = {"/Type":"/ExtGState", "/CA":gst.CA};
			cnt += sname + " gs ";
		}
		if(ost.ca!=nst.ca) {
			var sname = "/alpha"+Math.round(255*nst.ca);
			if(eg[sname]==null) eg[sname] = {"/Type":"/ExtGState", "/ca":gst.ca};
			cnt += sname + " gs ";
		}
		/*if(ost.pth  !=nst.pth    )*/ 
		if(withPath) cnt += ToPDF.drawPath(gst.pth);
		
		//console.log(ost, nst);
		
		this._cont = cnt;
		this._gst = nst;
	}
	ToPDF.drawPath = function(pth) {
		var co = 0, out = "", F = ToPDF._flt;
		for(var i=0; i<pth.cmds.length; i++) {
			var cmd = pth.cmds[i];
			if     (cmd=="M") {  for(var j=0; j<2; j++) out += F(pth.crds[co++]) + " ";  out += "m ";  }
			else if(cmd=="L") {  for(var j=0; j<2; j++) out += F(pth.crds[co++]) + " ";  out += "l ";  }
			else if(cmd=="C") {  for(var j=0; j<6; j++) out += F(pth.crds[co++]) + " ";  out += "c ";  }
			else if(cmd=="Z") {  out += "h ";  }
			else throw cmd;
		}
		return out;
	}
	ToPDF._makeGrad = function(grd) {
		//grd = grd.slice(0);  grd[1]=grd[2];  grd = grd.slice(0,2);
		var bs = [], fs = [], enc=[0,1], sf = ToPDF._stopFun;
		if(grd.length==2) return sf(grd[0][1], grd[1][1]);
		fs.push(sf(grd[0][1], grd[1][1]));
		for(var i=1; i<grd.length-1; i++) {  bs.push(grd[i][0]);  fs.push(sf(grd[i][1], grd[i+1][1]));  enc.push(0,1);  }
		
		return {
			"/FunctionType":3,"/Encode":enc,"/Domain":[0,1],
			"/Bounds":bs, "/Functions":fs
		}
	}
	ToPDF._stopFun = function(c0, c1) {  return { "/FunctionType":2, "/C0":c0, "/C1":c1, "/Domain":[0,1], "/N":1};  }
	
	ToPDF.prototype.PutText = function(gst,str, stw, otf)
	{		
		//console.log(str);
		//console.log(otf);
		this.setGState(gst, false);
		var fi = this.addFont(gst.font.Tf, otf);
		this._cont += "q ";
		this._cont += ToPDF._mat(gst.ctm);  
		this._cont += ToPDF._mat(gst.font.Tm);
		this._cont += "BT  "+fi+" "+ToPDF._flt(gst.font.Tfs)+" Tf  0 0 Td  ("
		
		var bys = [];
		
		if(otf==null) {
			var win = [ 0x80, 0x20AC, 0x82, 0x201A, 0x83, 0x0192,	0x84, 0x201E, 0x85, 0x2026, 0x86, 0x2020, 0x87, 0x2021, 0x88, 0x02C6, 0x89, 0x2030,
	0x8A, 0x0160, 0x8B, 0x2039, 0x8C, 0x0152, 0x8E, 0x017D, 0x91, 0x2018, 0x92, 0x2019, 0x93, 0x201C, 0x94, 0x201D, 0x95, 0x2022, 0x96, 0x2013,
	0x97, 0x2014, 0x98, 0x02DC, 0x99, 0x2122, 0x9A, 0x0161, 0x9B, 0x203A, 0x9C, 0x0153, 0x9E, 0x017E, 0x9F, 0x0178	];
			for(var i=0; i<str.length; i++) {  
				var cc=str.charCodeAt(i);  
				if(cc>255) {  
					var bi = win.indexOf(cc);
					bys.push(bi==-1 ? 32 : win[bi-1]);  
				}
				else bys.push(cc);
			}
		} else {
			for(var i=0; i<str.length; i++) {  
				var cc=str.charCodeAt(i);  
				bys.push(cc&255);
			}
		}
		
		bys = FromPS.makeString(bys);
		
		for(var i=0; i<bys.length; i++) this._cont += String.fromCharCode(bys[i]);
		
		this._cont += ") Tj  ET ";
		this._cont += " Q\n";
	}
	
	ToPDF.prototype.PutImage = function(gst, img, w, h, msk) {
	
		if(img.length==w*h*4 && msk==null) {
			var area = w*h;
			var alph = new Uint8Array(area), aand = 255;
			for(var i=0; i<area; i++) {  alph[i] = img[(i<<2)+3];  aand &= img[(i<<2)+3];  }
			if(aand!=255) msk = alph;
		}
		
		var ii = this.addImage(img,w,h, msk);
		this.setGState(gst, false);
		
		this._cont += "q "+ToPDF._mat(gst.ctm);
		this._cont += ii + " Do  Q\n";
	}
	
	ToPDF.prototype.ShowPage = function() {
		//console.log(this._cont);
		//console.log(this._res);
		ToPDF.addPage(this._xr, this._cont, this._bnds);
		this._cont = "";
		this._gst = ToPDF.defState();
	}
	
	ToPDF.prototype.Print = function(str) {
	}
	
	ToPDF.prototype.Done = function() {
		var res = this._res;
		for(var p in res) if(Object.keys(res[p])==0) delete res[p];
		this.buffer = ToPDF.xrToPDF(this._xr);
	}
	ToPDF.prototype.addImage= function(img, w, h, msk){
		//console.log(img.length, w*h);
		var mii;
		if(msk) {
			var mst = msk;
			if(msk.length==w*h*4) {
				mst = new Uint8Array(w*h);
				for(var i=0; i<mst.length; i++) mst[i] = msk[(i<<2)+1];
			}
			mii = this.addImage(mst, w, h, null);
		}
		
		var fmt = ToPDF._format(img);
		
		var ist = img;
		if(img.length==w*h*4) {
			ist = new Uint8Array(w*h*3);
			for(var i=0; i<img.length; i+=4) {  var ti = 3*(i>>2);  ist[ti]=img[i+0];  ist[ti+1]=img[i+1];  ist[ti+2]=img[i+2];    }
		}
		
		var xo = this._res["/XObject"];
		for(var ii in xo) if(ToPDF._eq(this._xr[xo[ii].ind]["stream"],ist)) return ii;
		var ii = "/I"+(ToPDF.maxI(xo)+1);
		xo[ii] = {"typ":"ref",ind:this._xr.length};
		
		var io = {
			"/Type":"/XObject",
			"/Subtype":"/Image",
			"/BitsPerComponent":8,
			"/ColorSpace":(img.length==w*h || (fmt=="/DCTDecode" && ToPDF.jpgProp(img) && ToPDF.jpgProp(img).comps==1)) ? "/DeviceGray" : "/DeviceRGB",
			"/Height":h,
			"/Width":w,
			"stream":ist
		}
		if(fmt!=null) io["/Filter"] = ToPDF._format(img);
		if(msk) {  io["/SMask"] = {"typ":"ref","ind":this._xr.length-1};  delete xo[mii];  }
		this._xr.push(io);
		return ii;
	}
	ToPDF.jpgProp = function(data) {
		var off = 0;
		while(off<data.length) {
			while(data[off]==0xff) off++;
			var mrkr = data[off];  off++;
			
			if(mrkr==0xd8) continue;	// SOI
			if(mrkr==0xd9) break;		// EOI
			if(0xd0<=mrkr && mrkr<=0xd7) continue;
			if(mrkr==0x01) continue;	// TEM
			
			var len = ((data[off]<<8)|data[off+1])-2;  off+=2;  
			
			if(mrkr==0xc0) return {
				bpp : data[off],
				w : (data[off+1]<<8)|data[off+2],
				h : (data[off+3]<<8)|data[off+4],
				comps : data[off+5]
			}
			off+=len;
		}
	}
	ToPDF.readUshort = function(data, o) {  return ((data[o]<<8)|data[o+1]);  }
	ToPDF.maxI = function(xo) {
		var max;
		for(var ii in xo) max = ii;
		return max==null ? 0 : parseInt(max.slice(2));
	}
	ToPDF._basicFont = function(fn) {
		//console.log(fn);
		var ln = fn.toLowerCase();
		var fs = [  "Helvetica"  , "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
					"Times-Roman", "Times-Bold"    , "Times-Italic"     , "Times-BoldItalic"        ];
		var fi = 0;
		if(ln.indexOf("sans")!=-1) fi=0;
		else if(ln.indexOf("serif")!=-1) fi=4;
		var isB = (ln.indexOf("bold")!=-1);
		var isI = (ln.indexOf("italic")!=-1 || ln.indexOf("oblique")!=-1 || ln.endsWith("-it"));
		if(isB && isI) fi+=3;
		else if(isI) fi+=2;
		else if(isB) fi+=1;
		//console.log(fs[fi]);
		return fs[fi];
	}
	ToPDF.prototype.addFont = function(fn, otf) {
		fn = ToPDF._basicFont(fn);
		fn = "/"+fn;
		var fs = this._res["/Font"];
		for(var fi in fs) if(fs[fi]["/BaseFont"]==fn) return fi;
		var fi = "/F"+(ToPDF.maxI(fs)+1);
		var nf = {  "/Type":"/Font",  "/Subtype":"/Type1",  "/BaseFont": fn, "/Encoding":"/WinAnsiEncoding" }//, "/FirstChar":0, "/LastChar":0, "/Widths":[] };
		if(otf!=null) {
			var cmap = "/CIDInit /ProcSet findresource begin \
12 dict begin \
begincmap \
/CIDSystemInfo \
<<  /Registry (Adobe) \
/Ordering (UCS) \
/Supplement 0 \
>> def \
/CMapName /Adobe-Identity-UCS def \
/CMapType 2 def \
1 begincodespacerange \
<0000> <FFFF> \
endcodespacerange \
1 beginbfchar \
<0001> <200B> \
endbfchar \
endcmap \
CMapName currentdict /CMap defineresource pop \
end \
end";
			var buf = new Uint8Array(cmap.length);  for(var i=0; i<cmap.length; i++) buf[i]=cmap.charCodeAt(i);
			nf["/Subtype"] = "/TrueType";
			delete nf["/Encoding"];
			//nf["/ToUnicode"] = { "stream":buf };
			nf["/FirstChar"] = 0;
			nf["/Widths"   ] = [];  for(var i=0; i<256; i++) nf["/Widths"   ].push(500);
			nf["/LastChar" ] = nf["/Widths"   ].length-1;
			nf["/FontDescriptor"] =  {
				"/Ascent": 905,
				"/CapHeight": 1010,
				"/Descent": 211,
				"/Flags": 4,
				"/FontBBox": [-627, -376, 2000, 1011],
				//"/FontFile2": {/Length: 10825, /Length1: 23164, stream: Uint8Array(23164)}
				"/FontName": fn,
				"/ItalicAngle": 0,
				"/StemV": 80,
				"/Type": "/FontDescriptor",
				"/FontFile2":{ "stream": new Uint8Array(otf) }
			}
		} 
		fs[fi] = nf;
		return fi;
	}
	ToPDF.addPage = function(xr, stm, box) {
		var i = xr.length;
		xr[2]["/Kids"].push({typ:"ref",ind:i});
		xr[2]["/Count"]++;
		xr.push({ "/Type":"/Page",    
			"/Parent"   :{ typ:"ref",ind:2 }, 
			"/Resources":{ typ:"ref",ind:3 },
			"/MediaBox": box,
			"/Contents" :{ typ:"ref",ind:i+1 }
		});
		xr.push({"stream":stm});
	}
	
	ToPDF.xrToPDF = function(xr)
	{
		var F = {file:new ToPDF.MFile(), off:0}, W = ToPDF.write, offs = [];
		
		W(F, "%PDF-1.1\n");
		for(var i=1; i<xr.length; i++) {
			offs.push(F.off);
			W(F, i+" 0 obj\n");
			ToPDF.writeDict(F, xr[i], 0);
			W(F, "\nendobj\n");
		}
		var sxr = F.off;
		W(F, "xref\n");
		W(F, "0 "+xr.length+"\n");
		W(F, "0000000000 65535 f \n");
		for(var i=0; i<offs.length; i++) {
			var oo = offs[i]+"";  while(oo.length<10) oo = "0"+oo;
			W(F, oo+" 00000 n \n");
		}
		W(F, "trailer\n");
		ToPDF.writeDict(F, {"/Root": {typ:"ref", ind:1}, "/Size":xr.length}, 0);
		W(F, "\nstartxref\n"+sxr+"\n%%EOF\n");
		return F.file.data.buffer.slice(0, F.off);
	}
	ToPDF.write = function(F, s)
	{
		F.file.req(F.off, s.length);
		for(var i=0; i<s.length; i++) F.file.data[F.off+i] = s.charCodeAt(i);
		F.off+=s.length;
	}
	ToPDF._tab = "    ";
	ToPDF.spc = function(n) {  var out="";  for(var i=0; i<n; i++) out+=ToPDF._tab;  return out;  }
	ToPDF.writeValue = function(F, v, dpt)
	{
		var W = ToPDF.write;
		if(false) {}
		else if(typeof v == "string" ) W(F, v);
		else if(typeof v == "number" ) W(F, ""+v);
		else if(typeof v == "boolean") W(F, ""+v);
		else if(v.typ!=null) W(F, v.ind+" 0 R");
		else if(v instanceof Array ) ToPDF.writeArray(F, v, dpt+1);
		else if(v instanceof Object) ToPDF.writeDict (F, v, dpt+1);
		else {  console.log(v);  throw "e";  }
	}
	ToPDF.writeDict = function(F, d, dpt) {
		var W = ToPDF.write, S = ToPDF.spc;
		var stm = d["stream"];
		if(stm) {
			if((typeof stm)=="string") {
				var nstm = new Uint8Array(stm.length);
				for(var i=0; i<stm.length; i++) nstm[i]=stm.charCodeAt(i);
				stm = nstm;  
			}
			if(d["/Filter"]==null) {
				d["/Filter"]="/FlateDecode";
				stm = pako["deflate"](stm);
			}
		}
		W(F,"<<\n");
		for(var p in d) {
			if(p.charAt(0)!="/") continue;
			W(F, S(dpt+1)+p+" "); 
			ToPDF.writeValue(F, d[p], dpt);
			W(F, "\n");
		}
		if(stm) W(F, S(dpt+1)+"/Length "+stm.length+"\n");
		W(F,S(dpt)+">>");
		if(stm) {
			W(F, S(dpt)+"\nstream\n");
			F.file.req(F.off, stm.length);
			for(var i=0; i<stm.length; i++) F.file.data[F.off+i]=stm[i];
			F.off += stm.length;
			W(F, S(dpt)+"\nendstream");
		}
	}
	ToPDF.writeArray = function(F, a, dpt)
	{
		var W = ToPDF.write;
		W(F,"[ ");
		for(var i=0; i<a.length; i++) {
			ToPDF.writeValue(F, a[i], dpt+1);
			if(i!=a.length-1) W(F, " ");
		}
		W(F," ]");
	}
	
	ToPDF.MFile = function()
	{
		this.size = 16;
		this.data = new Uint8Array(16);
	}
	ToPDF.MFile.prototype.req = function(off, len)
	{
		if(off + len <= this.size) return;
		var ps = this.size;
		while(off+len>this.size) this.size *= 2;
		var ndata = new Uint8Array(this.size);
		for(var i=0; i<ps; i++) ndata[i] = this.data[i];
		this.data = ndata;
	}
	
	

	function ToEMF()
	{
		/*
		this._gst = ToEMF.defState();*/
		this._file = {file:new ToEMF.MFile(), off:0};
		
		this._lstw = 0;
		this._curx = 0;
		this._curh = 0;
		
		this._recs = 0;
		this._lenp = 0;
		
		this._objs = {};
		this._tabl = 1;
		this._stkf = 0; 
		this._tclr = 0;  // text color

		this._curt = {"p":-1, "b":-1, "t":-1};
		this._inited = false;
	}
	
	
	ToEMF.prototype.StartPage = function(x0,y0,x1,y1) {
		this._check();
		var f = this._file, wU32=ToEMF.B.writeUint, wI32=ToEMF.B.writeInt;
		this._curh = Math.max(this._curh, y1*10);
		if(!this._inited) {
			this._inited = true;
			this._addRec("HEADER", 88);
			ToEMF._writeHeadBox(f, [x0,y0,x1,y1]);  f.off+=32;
			ToEMF.B.writeASCII(f.file,f.off," EMF");  f.off+=4;
			wU32(f.file,f.off,65536);  f.off+=4;
			this._lenp = f.off;  f.off+=4+4+4;
			f.off += 4+4+4;
			wI32(f.file,f.off,1440);  f.off+=4;
			wI32(f.file,f.off, 900);  f.off+=4;
			wI32(f.file,f.off, 508);  f.off+=4;
			wI32(f.file,f.off, 318);  f.off+=4;
			
			this._trsf([0.1,0,0,0.1,0,0]);
			
			this._addRec("SETBKMODE", 12);	// makes text background transparent
			wU32(f.file,f.off,1);  f.off+=4;
			this._addRec("SETTEXTALIGN", 12);
			wU32(f.file,f.off,24);  f.off+=4;
		}
		else {
			this._curx += this._lstw;
			ToEMF._writeHeadBox(f, [0,0, this._curx+x1, Math.round(this._curh/10)]);
		}
		this._lstw = x1;
	}
	ToEMF.prototype.Stroke = function(gst         ) {  this._draw(gst, 1);  }	
	ToEMF.prototype.Fill   = function(gst, evenOdd) {  this._draw(gst, 2);  }
	ToEMF.prototype.PutImage=function(gst, img, w, h, msk) { 
		var imgl = img.length;  if((imgl&3)!=0) imgl += 4-(imgl&3);
		var m = [1,0,0,-1,0,1];  UDOC.M.concat(m,gst.ctm);
		UDOC.M.scale(m, 10, 10);
		UDOC.M.scale(m, 1, -1);
		UDOC.M.translate(m, this._curx, this._curh);
		this._trsf(m);
		
		var f = this._file, wU32=ToEMF.B.writeUint, wI32=ToEMF.B.writeInt, wU16=ToEMF.B.writeUshort;
		var soff = 8+16+14*4;
		this._addRec("STRETCHDIBITS",soff+40+imgl);
		//console.log(img.length, w*h*4);
		
		f.off+=16; // bbox
		wI32(f.file,f.off,Math.round(0));  f.off+=4;
		wI32(f.file,f.off,Math.round(0));  f.off+=4;
		f.off+=8;
		wI32(f.file,f.off,w);  f.off+=4;
		wI32(f.file,f.off,h);  f.off+=4;
		wU32(f.file,f.off,soff);  f.off+=4;
		wU32(f.file,f.off,40);  f.off+=4;
		wU32(f.file,f.off,soff+40);  f.off+=4;
		wU32(f.file,f.off,img.length);  f.off+=4;
		f.off+=4;
		wU32(f.file,f.off,0x00cc0020);  f.off+=4;
		wI32(f.file,f.off,Math.round(1));  f.off+=4;
		wI32(f.file,f.off,Math.round(1));  f.off+=4;
		
		wI32(f.file,f.off,40);  f.off+=4;
		wI32(f.file,f.off, w);  f.off+=4;
		wI32(f.file,f.off, h);  f.off+=4;
		wU16(f.file,f.off, 1);  f.off+=2;
		wU16(f.file,f.off,32);  f.off+=2;
		wI32(f.file,f.off, 0);  f.off+=4;
		wI32(f.file,f.off,img.length);  f.off+=4;
		wI32(f.file,f.off,3800);  f.off+=4;
		wI32(f.file,f.off,3800);  f.off+=4;
		f.off+=8;
		f.file.req(f.off, img.length);
		if(img.length==w*h*4) {
			for(var y=0; y<h; y++) 
				for(var x=0; x<w; x++) {
					var qi=(y*w+x)<<2, ti=f.off + (((h-1-y)*w+x)<<2);
					f.file.data[ti  ]=img[qi+2];
					f.file.data[ti+1]=img[qi+1];
					f.file.data[ti+2]=img[qi  ];
					f.file.data[ti+3]=img[qi+3];
				}
		}
		else for(var i=0; i<img.length; i++) f.file.data[f.off+i] = img[i];
		
		f.off+=imgl;
		
		UDOC.M.invert(m);  this._trsf(m);
	}
	ToEMF.prototype.PutText= function(gst, str,stw) {
		var strl = str.length;
		if((strl&1)==1) strl++;
		this._check();    //return;
		var f = this._file, wU32=ToEMF.B.writeUint, wI32=ToEMF.B.writeInt, wU=ToEMF.B.writeUshort, wF=ToEMF.B.writeFloat;
		
		//*
		var tclr = ToEMF._color(gst.colr);
		if(tclr!=this._tclr) {
			this._addRec("SETTEXTCOLOR", 12);
			wU32(f.file, f.off, tclr);  f.off+=4;
			this._tclr = tclr;
		}//*/
		
		this._setTool("f", [gst.font.Tf, Math.round(gst.font.Tfs*10)]);
		
		var ox = 10*(gst.ctm[4]+this._curx), oy = this._curh-10*gst.ctm[5], gotRot = Math.abs(gst.ctm[1])>0.05, rm;
		if(gotRot) {  rm=gst.ctm.slice(0);  rm[1]*=-1;  rm[2]*=-1;  rm[4]=ox;  rm[5]=oy;  ox=oy=0;  this._trsf(rm);  }
		
		var soff = 8+16+12  +4*6  +16;
		this._addRec("EXTTEXTOUTW", soff+ strl*2);
		//ToEMF._writeBox(f, [0,0,500,500]);
		f.off+=16;
		wU32(f.file,f.off,2);  f.off+=4;
		wF  (f.file,f.off,31.25);  f.off+=4;
		wF  (f.file,f.off,31.25);  f.off+=4;
		
		wI32(f.file,f.off,Math.round(ox));  f.off+=4;
		wI32(f.file,f.off,Math.round(oy));  f.off+=4;
		wU32(f.file,f.off,str.length);  f.off+=4;
		wU32(f.file,f.off,soff);  f.off+=4;
		wU32(f.file,f.off,0);  f.off+=4;
		//ToEMF._writeBox(f, [0,0,3000,3000]);
		f.off+=16;
		wU32(f.file,f.off,0);  f.off+=4;
		for(var i=0; i<str.length; i++) wU(f.file, f.off+i*2, str.charCodeAt(i));
		f.off+=2*strl;
		
		if(gotRot) {  UDOC.M.invert(rm);  this._trsf(rm);  }
	}	
	ToEMF.prototype.ShowPage=function() {  this._check();  }
	ToEMF.prototype.Done   = function() { 
		this._check();	
		var f = this._file, wU32=ToEMF.B.writeUint;
		this._addRec("EOF", 20);
		wU32(f.file,f.off, 0);  f.off+=4;
		wU32(f.file,f.off,16);  f.off+=4;
		wU32(f.file,f.off,20);  f.off+=4;
		
		wU32(f.file,this._lenp  , f.off);
		wU32(f.file,this._lenp+4, this._recs);
		wU32(f.file,this._lenp+8, this._tabl);
		this.buffer = f.file.data.buffer.slice(0,f.off);  
	}
	
	ToEMF.prototype._check = function() {
		var f = this._file, sf = this._stkf;  if(sf==0) return;
		if(sf==1) this._addRec("STROKEPATH",24); 
		if(sf==2) this._addRec("FILLPATH",24); 	
		if(sf==3) this._addRec("STROKEANDFILLPATH",24); 	
		f.off+=16;
		this._stkf=0;
	}
	
	ToEMF.prototype._addRec   = function(fnm, siz) {
		var f = this._file, wU32=ToEMF.B.writeUint;
		this._recs++;
		wU32(f.file,f.off,ToEMF.C["EMR_"+fnm]);  f.off+=4;
		wU32(f.file,f.off,siz);  f.off+=4;
	}
	ToEMF.prototype._trsf = function(mat) {
		var f = this._file, wI32=ToEMF.B.writeInt;
		this._addRec("MODIFYWORLDTRANSFORM", 36);
		for(var i=0; i<mat.length; i++) {  ToEMF.B.writeFloat(f.file, f.off, mat[i]);  f.off+=4;  }
		wI32(f.file,f.off, 2);  f.off+=4;
	}
	ToEMF._writeHeadBox = function(f, box) {
		var loff = f.off;  f.off = 8;
		ToEMF._writeBox(f, box);
		var scl = (1/72)*25.4*100;
		ToEMF._writeBox(f, [0,0,Math.round((box[2]-box[0])*scl), Math.round((box[3]-box[1])*scl)]);
		f.off = loff;
	}
	ToEMF._writeBox = function(f, box) {
		for(var i=0; i<4; i++) {  ToEMF.B.writeInt(f.file, f.off, box[i]);  f.off+=4;  }
	}
	
	ToEMF.prototype._draw = function(gst, stkf) {  // stkf is 1 or 2
		var f = this._file, wU32=ToEMF.B.writeUint, wI32=ToEMF.B.writeInt;
		
		var pth = gst.pth, spth = JSON.stringify(pth);
		if(this._cpth!=spth) this._check();
		
		if(stkf==1) this._setTool("p", [gst.COLR, gst.lwidth, gst.ljoin]);
		else        this._setTool("b", [gst.colr]);
		
		if(this._cpth==spth) {
			this._stkf += stkf;
		}
		else {
			var ops = {  "M":["MOVETOEX",1], "L":["LINETO",1], "C":["POLYBEZIERTO",3], "Z":["CLOSEFIGURE",0]   }
			var coff=0, cl=pth.cmds.length;
			this._addRec("BEGINPATH",8);
			for(var i=0; i<cl; i++) {
				var c = pth.cmds[i];
				var op = ops[c];  if(op==null) throw c+" e";
				
				var cnum = op[1]*2, fnm=op[0], hsz = 8 + 4*cnum, cnt=1;
				while(true) {  if(i+cnt<cl && pth.cmds[i+cnt]==c) cnt++;  else break;  }
				var useMulti = c=="C" || (c=="L" && cnt>1);
				if(useMulti) {
					cnum *= cnt;
					if(c=="L") fnm="POLYLINETO";
					hsz = 8 + 20 + 4*cnum;
				}
				this._addRec(fnm,hsz);
				if(useMulti) {  f.off+=16;  wU32(f.file, f.off, cnt*op[1]);  f.off+=4;  i+=cnt-1;  }
				for(var j=0; j<cnum; j+=2) {  
					wI32(f.file, f.off, Math.round(10*(pth.crds[coff]+this._curx)));  f.off+=4;  coff++;  
					wI32(f.file, f.off, Math.round(this._curh-10*pth.crds[coff]));  f.off+=4;  coff++;  
				}
			}
			this._addRec("ENDPATH",8);
			this._cpth = spth;
			this._stkf = stkf;
		}
	}
	
	ToEMF.prototype._setTool = function(t, pms) {
		var f = this._file, wU32=ToEMF.B.writeUint, wI32=ToEMF.B.writeInt;
		
		var bkey = t+JSON.stringify(pms);
		var bid = this._objs[bkey];
		if(bid==null) {
			bid = this._objs[bkey] = this._tabl;  this._tabl++;
			if(t=="b") this._addRec("CREATEBRUSHINDIRECT",24);
			if(t=="p") this._addRec("CREATEPEN",          28);
			if(t=="f") this._addRec("EXTCREATEFONTINDIRECTW",104);
			wU32(f.file, f.off, bid);  f.off+=4;
				
			if(t=="b" || t=="p") {
				if(t=="p") {
					wU32(f.file, f.off, 0/*[0x2000,0,0x1000][pms[2]]*/);  f.off+=4;
					var lw = Math.round(pms[1]*10);
					wU32(f.file, f.off, lw);  f.off+=4;
					wU32(f.file, f.off, lw);  f.off+=4;
				}
				else {  wU32(f.file, f.off, 0);  f.off+=4;  }
				
				wU32(f.file, f.off, ToEMF._color(pms[0]));  f.off+=4;
				if(t=="b") {  wU32(f.file, f.off, 0);  f.off+=4;  }
			}
			if(t=="f") {
				var fn = pms[0], isB = fn.toLowerCase().indexOf("bold")!=-1;
				if(fn.endsWith("-Bold")) fn=fn.slice(0,fn.length-5);
				wI32(f.file, f.off, -pms[1]);  f.off+=4;
				f.off+=12;  // wid, esc, orn,
				wU32(f.file, f.off, isB ? 700 : 400);  f.off+=4;
				wU32(f.file, f.off, 0x00000000);  f.off+=4; // 0, 0, 0, 0
				wU32(f.file, f.off, 0x00040007);  f.off+=4; // 7, 0, 4, 0
				for(var i=0; i<fn.length; i++) ToEMF.B.writeUshort(f.file, f.off+i*2, fn.charCodeAt(i));
				//ToEMF.B.writeASCII(f.file, f.off, fn);
				f.off+=64;
			}
		}
		if(this._curt[t]!=bid) {
			this._addRec("SELECTOBJECT",12);
			wU32(f.file, f.off, bid);  f.off+=4;
			this._curt[t]=bid;
		}
	}
	ToEMF._color = function(clr) {  var r=Math.round(clr[0]*255), g=Math.round(clr[1]*255), b=Math.round(clr[2]*255);  return (b<<16)|(g<<8)|(r<<0);  }
	
	
	ToEMF.B = {
		uint8 : new Uint8Array(4),
		writeShort  : function(f,p,v)  {  ToEMF.B.int16 [0]=v;  f.req(p,2);  var u8=ToEMF.B.uint8,b=f.data;  b[p]=u8[0];  b[p+1]=u8[1];  },
		writeUshort : function(f,p,v)  {  ToEMF.B.uint16[0]=v;  f.req(p,2);  var u8=ToEMF.B.uint8,b=f.data;  b[p]=u8[0];  b[p+1]=u8[1];  },
		writeInt    : function(f,p,v)  {  ToEMF.B.int32 [0]=v;  f.req(p,4);  var u8=ToEMF.B.uint8,b=f.data;  b[p]=u8[0];  b[p+1]=u8[1];  b[p+2]=u8[2];  b[p+3]=u8[3];  },
		writeUint   : function(f,p,v)  {  ToEMF.B.uint32[0]=v;  f.req(p,4);  var u8=ToEMF.B.uint8,b=f.data;  b[p]=u8[0];  b[p+1]=u8[1];  b[p+2]=u8[2];  b[p+3]=u8[3];  },
		writeFloat  : function(f,p,v)  {  ToEMF.B.flot32[0]=v;  f.req(p,4);  var u8=ToEMF.B.uint8,b=f.data;  b[p]=u8[0];  b[p+1]=u8[1];  b[p+2]=u8[2];  b[p+3]=u8[3];  },
		writeASCII  : function(f,p,v)  {  f.req(p,v.length);  for(var i=0; i<v.length; i++) f.data[p+i]=v.charCodeAt(i);  }
	}
	ToEMF.B.int16  = new Int16Array (ToEMF.B.uint8.buffer);
	ToEMF.B.uint16 = new Uint16Array(ToEMF.B.uint8.buffer);
	ToEMF.B.int32  = new Int32Array (ToEMF.B.uint8.buffer);
	ToEMF.B.uint32 = new Uint32Array(ToEMF.B.uint8.buffer);
	ToEMF.B.flot32 = new Float32Array(ToEMF.B.uint8.buffer);
	
	
	ToEMF.MFile = function()
	{
		this.size = 16;
		this.data = new Uint8Array(16);
	}
	ToEMF.MFile.prototype.req = function(off, len)
	{
		if(off + len <= this.size) return;
		var ps = this.size;
		while(off+len>this.size) this.size *= 2;
		var ndata = new Uint8Array(this.size);
		for(var i=0; i<ps; i++) ndata[i] = this.data[i];
		this.data = ndata;
	}
	
	ToEMF.C = {
		EMR_HEADER : 0x00000001,
		EMR_POLYBEZIER : 0x00000002,
		EMR_POLYGON : 0x00000003,
		EMR_POLYLINE : 0x00000004,
		EMR_POLYBEZIERTO : 0x00000005,
		EMR_POLYLINETO : 0x00000006,
		EMR_POLYPOLYLINE : 0x00000007,
		EMR_POLYPOLYGON : 0x00000008,
		EMR_SETWINDOWEXTEX : 0x00000009,
		EMR_SETWINDOWORGEX : 0x0000000A,
		EMR_SETVIEWPORTEXTEX : 0x0000000B,
		EMR_SETVIEWPORTORGEX : 0x0000000C,
		EMR_SETBRUSHORGEX : 0x0000000D,
		EMR_EOF : 0x0000000E,
		EMR_SETPIXELV : 0x0000000F,
		EMR_SETMAPPERFLAGS : 0x00000010,
		EMR_SETMAPMODE : 0x00000011,
		EMR_SETBKMODE : 0x00000012,
		EMR_SETPOLYFILLMODE : 0x00000013,
		EMR_SETROP2 : 0x00000014,
		EMR_SETSTRETCHBLTMODE : 0x00000015,
		EMR_SETTEXTALIGN : 0x00000016,
		EMR_SETCOLORADJUSTMENT : 0x00000017,
		EMR_SETTEXTCOLOR : 0x00000018,
		EMR_SETBKCOLOR : 0x00000019,
		EMR_OFFSETCLIPRGN : 0x0000001A,
		EMR_MOVETOEX : 0x0000001B,
		EMR_SETMETARGN : 0x0000001C,
		EMR_EXCLUDECLIPRECT : 0x0000001D,
		EMR_INTERSECTCLIPRECT : 0x0000001E,
		EMR_SCALEVIEWPORTEXTEX : 0x0000001F,
		EMR_SCALEWINDOWEXTEX : 0x00000020,
		EMR_SAVEDC : 0x00000021,
		EMR_RESTOREDC : 0x00000022,
		EMR_SETWORLDTRANSFORM : 0x00000023,
		EMR_MODIFYWORLDTRANSFORM : 0x00000024,
		EMR_SELECTOBJECT : 0x00000025,
		EMR_CREATEPEN : 0x00000026,
		EMR_CREATEBRUSHINDIRECT : 0x00000027,
		EMR_DELETEOBJECT : 0x00000028,
		EMR_ANGLEARC : 0x00000029,
		EMR_ELLIPSE : 0x0000002A,
		EMR_RECTANGLE : 0x0000002B,
		EMR_ROUNDRECT : 0x0000002C,
		EMR_ARC : 0x0000002D,
		EMR_CHORD : 0x0000002E,
		EMR_PIE : 0x0000002F,
		EMR_SELECTPALETTE : 0x00000030,
		EMR_CREATEPALETTE : 0x00000031,
		EMR_SETPALETTEENTRIES : 0x00000032,
		EMR_RESIZEPALETTE : 0x00000033,
		EMR_REALIZEPALETTE : 0x00000034,
		EMR_EXTFLOODFILL : 0x00000035,
		EMR_LINETO : 0x00000036,
		EMR_ARCTO : 0x00000037,
		EMR_POLYDRAW : 0x00000038,
		EMR_SETARCDIRECTION : 0x00000039,
		EMR_SETMITERLIMIT : 0x0000003A,
		EMR_BEGINPATH : 0x0000003B,
		EMR_ENDPATH : 0x0000003C,
		EMR_CLOSEFIGURE : 0x0000003D,
		EMR_FILLPATH : 0x0000003E,
		EMR_STROKEANDFILLPATH : 0x0000003F,
		EMR_STROKEPATH : 0x00000040,
		EMR_FLATTENPATH : 0x00000041,
		EMR_WIDENPATH : 0x00000042,
		EMR_SELECTCLIPPATH : 0x00000043,
		EMR_ABORTPATH : 0x00000044,
		EMR_COMMENT : 0x00000046,
		EMR_FILLRGN : 0x00000047,
		EMR_FRAMERGN : 0x00000048,
		EMR_INVERTRGN : 0x00000049,
		EMR_PAINTRGN : 0x0000004A,
		EMR_EXTSELECTCLIPRGN : 0x0000004B,
		EMR_BITBLT : 0x0000004C,
		EMR_STRETCHBLT : 0x0000004D,
		EMR_MASKBLT : 0x0000004E,
		EMR_PLGBLT : 0x0000004F,
		EMR_SETDIBITSTODEVICE : 0x00000050,
		EMR_STRETCHDIBITS : 0x00000051,
		EMR_EXTCREATEFONTINDIRECTW : 0x00000052,
		EMR_EXTTEXTOUTA : 0x00000053,
		EMR_EXTTEXTOUTW : 0x00000054,
		EMR_POLYBEZIER16 : 0x00000055,
		EMR_POLYGON16 : 0x00000056,
		EMR_POLYLINE16 : 0x00000057,
		EMR_POLYBEZIERTO16 : 0x00000058,
		EMR_POLYLINETO16 : 0x00000059,
		EMR_POLYPOLYLINE16 : 0x0000005A,
		EMR_POLYPOLYGON16 : 0x0000005B,
		EMR_POLYDRAW16 : 0x0000005C,
		EMR_CREATEMONOBRUSH : 0x0000005D,
		EMR_CREATEDIBPATTERNBRUSHPT : 0x0000005E,
		EMR_EXTCREATEPEN : 0x0000005F,
		EMR_POLYTEXTOUTA : 0x00000060,
		EMR_POLYTEXTOUTW : 0x00000061,
		EMR_SETICMMODE : 0x00000062,
		EMR_CREATECOLORSPACE : 0x00000063,
		EMR_SETCOLORSPACE : 0x00000064,
		EMR_DELETECOLORSPACE : 0x00000065,
		EMR_GLSRECORD : 0x00000066,
		EMR_GLSBOUNDEDRECORD : 0x00000067,
		EMR_PIXELFORMAT : 0x00000068,
		EMR_DRAWESCAPE : 0x00000069,
		EMR_EXTESCAPE : 0x0000006A,
		EMR_SMALLTEXTOUT : 0x0000006C,
		EMR_FORCEUFIMAPPING : 0x0000006D,
		EMR_NAMEDESCAPE : 0x0000006E,
		EMR_COLORCORRECTPALETTE : 0x0000006F,
		EMR_SETICMPROFILEA : 0x00000070,
		EMR_SETICMPROFILEW : 0x00000071,
		EMR_ALPHABLEND : 0x00000072,
		EMR_SETLAYOUT : 0x00000073,
		EMR_TRANSPARENTBLT : 0x00000074,
		EMR_GRADIENTFILL : 0x00000076,
		EMR_SETLINKEDUFIS : 0x00000077,
		EMR_SETTEXTJUSTIFICATION : 0x00000078,
		EMR_COLORMATCHTOTARGETW : 0x00000079,
		EMR_CREATECOLORSPACEW : 0x0000007A
	};
	ToEMF.K = [];
	
	(function() {
		var inp, out, stt;
		inp = ToEMF.C;   out = ToEMF.K;   stt=4;
		for(var p in inp) out[inp[p]] = p.slice(stt);
	}  )();
	
	/* pako 1.0.5 nodeca/pako */
!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.pako=t()}}(function(){return function t(e,a,i){function n(s,o){if(!a[s]){if(!e[s]){var l="function"==typeof require&&require;if(!o&&l)return l(s,!0);if(r)return r(s,!0);var h=new Error("Cannot find module '"+s+"'");throw h.code="MODULE_NOT_FOUND",h}var d=a[s]={exports:{}};e[s][0].call(d.exports,function(t){var a=e[s][1][t];return n(a?a:t)},d,d.exports,t,e,a,i)}return a[s].exports}for(var r="function"==typeof require&&require,s=0;s<i.length;s++)n(i[s]);return n}({1:[function(t,e,a){"use strict";function i(t){if(!(this instanceof i))return new i(t);this.options=l.assign({level:w,method:v,chunkSize:16384,windowBits:15,memLevel:8,strategy:p,to:""},t||{});var e=this.options;e.raw&&e.windowBits>0?e.windowBits=-e.windowBits:e.gzip&&e.windowBits>0&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new f,this.strm.avail_out=0;var a=o.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(a!==b)throw new Error(d[a]);if(e.header&&o.deflateSetHeader(this.strm,e.header),e.dictionary){var n;if(n="string"==typeof e.dictionary?h.string2buf(e.dictionary):"[object ArrayBuffer]"===_.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,a=o.deflateSetDictionary(this.strm,n),a!==b)throw new Error(d[a]);this._dict_set=!0}}function n(t,e){var a=new i(e);if(a.push(t,!0),a.err)throw a.msg||d[a.err];return a.result}function r(t,e){return e=e||{},e.raw=!0,n(t,e)}function s(t,e){return e=e||{},e.gzip=!0,n(t,e)}var o=t("./zlib/deflate"),l=t("./utils/common"),h=t("./utils/strings"),d=t("./zlib/messages"),f=t("./zlib/zstream"),_=Object.prototype.toString,u=0,c=4,b=0,g=1,m=2,w=-1,p=0,v=8;i.prototype.push=function(t,e){var a,i,n=this.strm,r=this.options.chunkSize;if(this.ended)return!1;i=e===~~e?e:e===!0?c:u,"string"==typeof t?n.input=h.string2buf(t):"[object ArrayBuffer]"===_.call(t)?n.input=new Uint8Array(t):n.input=t,n.next_in=0,n.avail_in=n.input.length;do{if(0===n.avail_out&&(n.output=new l.Buf8(r),n.next_out=0,n.avail_out=r),a=o.deflate(n,i),a!==g&&a!==b)return this.onEnd(a),this.ended=!0,!1;0!==n.avail_out&&(0!==n.avail_in||i!==c&&i!==m)||("string"===this.options.to?this.onData(h.buf2binstring(l.shrinkBuf(n.output,n.next_out))):this.onData(l.shrinkBuf(n.output,n.next_out)))}while((n.avail_in>0||0===n.avail_out)&&a!==g);return i===c?(a=o.deflateEnd(this.strm),this.onEnd(a),this.ended=!0,a===b):i!==m||(this.onEnd(b),n.avail_out=0,!0)},i.prototype.onData=function(t){this.chunks.push(t)},i.prototype.onEnd=function(t){t===b&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=l.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},a.Deflate=i,a.deflate=n,a.deflateRaw=r,a.gzip=s},{"./utils/common":3,"./utils/strings":4,"./zlib/deflate":8,"./zlib/messages":13,"./zlib/zstream":15}],2:[function(t,e,a){"use strict";function i(t){if(!(this instanceof i))return new i(t);this.options=o.assign({chunkSize:16384,windowBits:0,to:""},t||{});var e=this.options;e.raw&&e.windowBits>=0&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(e.windowBits>=0&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),e.windowBits>15&&e.windowBits<48&&0===(15&e.windowBits)&&(e.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new f,this.strm.avail_out=0;var a=s.inflateInit2(this.strm,e.windowBits);if(a!==h.Z_OK)throw new Error(d[a]);this.header=new _,s.inflateGetHeader(this.strm,this.header)}function n(t,e){var a=new i(e);if(a.push(t,!0),a.err)throw a.msg||d[a.err];return a.result}function r(t,e){return e=e||{},e.raw=!0,n(t,e)}var s=t("./zlib/inflate"),o=t("./utils/common"),l=t("./utils/strings"),h=t("./zlib/constants"),d=t("./zlib/messages"),f=t("./zlib/zstream"),_=t("./zlib/gzheader"),u=Object.prototype.toString;i.prototype.push=function(t,e){var a,i,n,r,d,f,_=this.strm,c=this.options.chunkSize,b=this.options.dictionary,g=!1;if(this.ended)return!1;i=e===~~e?e:e===!0?h.Z_FINISH:h.Z_NO_FLUSH,"string"==typeof t?_.input=l.binstring2buf(t):"[object ArrayBuffer]"===u.call(t)?_.input=new Uint8Array(t):_.input=t,_.next_in=0,_.avail_in=_.input.length;do{if(0===_.avail_out&&(_.output=new o.Buf8(c),_.next_out=0,_.avail_out=c),a=s.inflate(_,h.Z_NO_FLUSH),a===h.Z_NEED_DICT&&b&&(f="string"==typeof b?l.string2buf(b):"[object ArrayBuffer]"===u.call(b)?new Uint8Array(b):b,a=s.inflateSetDictionary(this.strm,f)),a===h.Z_BUF_ERROR&&g===!0&&(a=h.Z_OK,g=!1),a!==h.Z_STREAM_END&&a!==h.Z_OK)return this.onEnd(a),this.ended=!0,!1;_.next_out&&(0!==_.avail_out&&a!==h.Z_STREAM_END&&(0!==_.avail_in||i!==h.Z_FINISH&&i!==h.Z_SYNC_FLUSH)||("string"===this.options.to?(n=l.utf8border(_.output,_.next_out),r=_.next_out-n,d=l.buf2string(_.output,n),_.next_out=r,_.avail_out=c-r,r&&o.arraySet(_.output,_.output,n,r,0),this.onData(d)):this.onData(o.shrinkBuf(_.output,_.next_out)))),0===_.avail_in&&0===_.avail_out&&(g=!0)}while((_.avail_in>0||0===_.avail_out)&&a!==h.Z_STREAM_END);return a===h.Z_STREAM_END&&(i=h.Z_FINISH),i===h.Z_FINISH?(a=s.inflateEnd(this.strm),this.onEnd(a),this.ended=!0,a===h.Z_OK):i!==h.Z_SYNC_FLUSH||(this.onEnd(h.Z_OK),_.avail_out=0,!0)},i.prototype.onData=function(t){this.chunks.push(t)},i.prototype.onEnd=function(t){t===h.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},a.Inflate=i,a.inflate=n,a.inflateRaw=r,a.ungzip=n},{"./utils/common":3,"./utils/strings":4,"./zlib/constants":6,"./zlib/gzheader":9,"./zlib/inflate":11,"./zlib/messages":13,"./zlib/zstream":15}],3:[function(t,e,a){"use strict";var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;a.assign=function(t){for(var e=Array.prototype.slice.call(arguments,1);e.length;){var a=e.shift();if(a){if("object"!=typeof a)throw new TypeError(a+"must be non-object");for(var i in a)a.hasOwnProperty(i)&&(t[i]=a[i])}}return t},a.shrinkBuf=function(t,e){return t.length===e?t:t.subarray?t.subarray(0,e):(t.length=e,t)};var n={arraySet:function(t,e,a,i,n){if(e.subarray&&t.subarray)return void t.set(e.subarray(a,a+i),n);for(var r=0;r<i;r++)t[n+r]=e[a+r]},flattenChunks:function(t){var e,a,i,n,r,s;for(i=0,e=0,a=t.length;e<a;e++)i+=t[e].length;for(s=new Uint8Array(i),n=0,e=0,a=t.length;e<a;e++)r=t[e],s.set(r,n),n+=r.length;return s}},r={arraySet:function(t,e,a,i,n){for(var r=0;r<i;r++)t[n+r]=e[a+r]},flattenChunks:function(t){return[].concat.apply([],t)}};a.setTyped=function(t){t?(a.Buf8=Uint8Array,a.Buf16=Uint16Array,a.Buf32=Int32Array,a.assign(a,n)):(a.Buf8=Array,a.Buf16=Array,a.Buf32=Array,a.assign(a,r))},a.setTyped(i)},{}],4:[function(t,e,a){"use strict";function i(t,e){if(e<65537&&(t.subarray&&s||!t.subarray&&r))return String.fromCharCode.apply(null,n.shrinkBuf(t,e));for(var a="",i=0;i<e;i++)a+=String.fromCharCode(t[i]);return a}var n=t("./common"),r=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(t){r=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(t){s=!1}for(var o=new n.Buf8(256),l=0;l<256;l++)o[l]=l>=252?6:l>=248?5:l>=240?4:l>=224?3:l>=192?2:1;o[254]=o[254]=1,a.string2buf=function(t){var e,a,i,r,s,o=t.length,l=0;for(r=0;r<o;r++)a=t.charCodeAt(r),55296===(64512&a)&&r+1<o&&(i=t.charCodeAt(r+1),56320===(64512&i)&&(a=65536+(a-55296<<10)+(i-56320),r++)),l+=a<128?1:a<2048?2:a<65536?3:4;for(e=new n.Buf8(l),s=0,r=0;s<l;r++)a=t.charCodeAt(r),55296===(64512&a)&&r+1<o&&(i=t.charCodeAt(r+1),56320===(64512&i)&&(a=65536+(a-55296<<10)+(i-56320),r++)),a<128?e[s++]=a:a<2048?(e[s++]=192|a>>>6,e[s++]=128|63&a):a<65536?(e[s++]=224|a>>>12,e[s++]=128|a>>>6&63,e[s++]=128|63&a):(e[s++]=240|a>>>18,e[s++]=128|a>>>12&63,e[s++]=128|a>>>6&63,e[s++]=128|63&a);return e},a.buf2binstring=function(t){return i(t,t.length)},a.binstring2buf=function(t){for(var e=new n.Buf8(t.length),a=0,i=e.length;a<i;a++)e[a]=t.charCodeAt(a);return e},a.buf2string=function(t,e){var a,n,r,s,l=e||t.length,h=new Array(2*l);for(n=0,a=0;a<l;)if(r=t[a++],r<128)h[n++]=r;else if(s=o[r],s>4)h[n++]=65533,a+=s-1;else{for(r&=2===s?31:3===s?15:7;s>1&&a<l;)r=r<<6|63&t[a++],s--;s>1?h[n++]=65533:r<65536?h[n++]=r:(r-=65536,h[n++]=55296|r>>10&1023,h[n++]=56320|1023&r)}return i(h,n)},a.utf8border=function(t,e){var a;for(e=e||t.length,e>t.length&&(e=t.length),a=e-1;a>=0&&128===(192&t[a]);)a--;return a<0?e:0===a?e:a+o[t[a]]>e?a:e}},{"./common":3}],5:[function(t,e,a){"use strict";function i(t,e,a,i){for(var n=65535&t|0,r=t>>>16&65535|0,s=0;0!==a;){s=a>2e3?2e3:a,a-=s;do n=n+e[i++]|0,r=r+n|0;while(--s);n%=65521,r%=65521}return n|r<<16|0}e.exports=i},{}],6:[function(t,e,a){"use strict";e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],7:[function(t,e,a){"use strict";function i(){for(var t,e=[],a=0;a<256;a++){t=a;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[a]=t}return e}function n(t,e,a,i){var n=r,s=i+a;t^=-1;for(var o=i;o<s;o++)t=t>>>8^n[255&(t^e[o])];return t^-1}var r=i();e.exports=n},{}],8:[function(t,e,a){"use strict";function i(t,e){return t.msg=D[e],e}function n(t){return(t<<1)-(t>4?9:0)}function r(t){for(var e=t.length;--e>=0;)t[e]=0}function s(t){var e=t.state,a=e.pending;a>t.avail_out&&(a=t.avail_out),0!==a&&(R.arraySet(t.output,e.pending_buf,e.pending_out,a,t.next_out),t.next_out+=a,e.pending_out+=a,t.total_out+=a,t.avail_out-=a,e.pending-=a,0===e.pending&&(e.pending_out=0))}function o(t,e){C._tr_flush_block(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,s(t.strm)}function l(t,e){t.pending_buf[t.pending++]=e}function h(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e}function d(t,e,a,i){var n=t.avail_in;return n>i&&(n=i),0===n?0:(t.avail_in-=n,R.arraySet(e,t.input,t.next_in,n,a),1===t.state.wrap?t.adler=N(t.adler,e,n,a):2===t.state.wrap&&(t.adler=O(t.adler,e,n,a)),t.next_in+=n,t.total_in+=n,n)}function f(t,e){var a,i,n=t.max_chain_length,r=t.strstart,s=t.prev_length,o=t.nice_match,l=t.strstart>t.w_size-ft?t.strstart-(t.w_size-ft):0,h=t.window,d=t.w_mask,f=t.prev,_=t.strstart+dt,u=h[r+s-1],c=h[r+s];t.prev_length>=t.good_match&&(n>>=2),o>t.lookahead&&(o=t.lookahead);do if(a=e,h[a+s]===c&&h[a+s-1]===u&&h[a]===h[r]&&h[++a]===h[r+1]){r+=2,a++;do;while(h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&r<_);if(i=dt-(_-r),r=_-dt,i>s){if(t.match_start=e,s=i,i>=o)break;u=h[r+s-1],c=h[r+s]}}while((e=f[e&d])>l&&0!==--n);return s<=t.lookahead?s:t.lookahead}function _(t){var e,a,i,n,r,s=t.w_size;do{if(n=t.window_size-t.lookahead-t.strstart,t.strstart>=s+(s-ft)){R.arraySet(t.window,t.window,s,s,0),t.match_start-=s,t.strstart-=s,t.block_start-=s,a=t.hash_size,e=a;do i=t.head[--e],t.head[e]=i>=s?i-s:0;while(--a);a=s,e=a;do i=t.prev[--e],t.prev[e]=i>=s?i-s:0;while(--a);n+=s}if(0===t.strm.avail_in)break;if(a=d(t.strm,t.window,t.strstart+t.lookahead,n),t.lookahead+=a,t.lookahead+t.insert>=ht)for(r=t.strstart-t.insert,t.ins_h=t.window[r],t.ins_h=(t.ins_h<<t.hash_shift^t.window[r+1])&t.hash_mask;t.insert&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[r+ht-1])&t.hash_mask,t.prev[r&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=r,r++,t.insert--,!(t.lookahead+t.insert<ht)););}while(t.lookahead<ft&&0!==t.strm.avail_in)}function u(t,e){var a=65535;for(a>t.pending_buf_size-5&&(a=t.pending_buf_size-5);;){if(t.lookahead<=1){if(_(t),0===t.lookahead&&e===I)return vt;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var i=t.block_start+a;if((0===t.strstart||t.strstart>=i)&&(t.lookahead=t.strstart-i,t.strstart=i,o(t,!1),0===t.strm.avail_out))return vt;if(t.strstart-t.block_start>=t.w_size-ft&&(o(t,!1),0===t.strm.avail_out))return vt}return t.insert=0,e===F?(o(t,!0),0===t.strm.avail_out?yt:xt):t.strstart>t.block_start&&(o(t,!1),0===t.strm.avail_out)?vt:vt}function c(t,e){for(var a,i;;){if(t.lookahead<ft){if(_(t),t.lookahead<ft&&e===I)return vt;if(0===t.lookahead)break}if(a=0,t.lookahead>=ht&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+ht-1])&t.hash_mask,a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==a&&t.strstart-a<=t.w_size-ft&&(t.match_length=f(t,a)),t.match_length>=ht)if(i=C._tr_tally(t,t.strstart-t.match_start,t.match_length-ht),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=ht){t.match_length--;do t.strstart++,t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+ht-1])&t.hash_mask,a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart;while(0!==--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+1])&t.hash_mask;else i=C._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(i&&(o(t,!1),0===t.strm.avail_out))return vt}return t.insert=t.strstart<ht-1?t.strstart:ht-1,e===F?(o(t,!0),0===t.strm.avail_out?yt:xt):t.last_lit&&(o(t,!1),0===t.strm.avail_out)?vt:kt}function b(t,e){for(var a,i,n;;){if(t.lookahead<ft){if(_(t),t.lookahead<ft&&e===I)return vt;if(0===t.lookahead)break}if(a=0,t.lookahead>=ht&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+ht-1])&t.hash_mask,a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=ht-1,0!==a&&t.prev_length<t.max_lazy_match&&t.strstart-a<=t.w_size-ft&&(t.match_length=f(t,a),t.match_length<=5&&(t.strategy===q||t.match_length===ht&&t.strstart-t.match_start>4096)&&(t.match_length=ht-1)),t.prev_length>=ht&&t.match_length<=t.prev_length){n=t.strstart+t.lookahead-ht,i=C._tr_tally(t,t.strstart-1-t.prev_match,t.prev_length-ht),t.lookahead-=t.prev_length-1,t.prev_length-=2;do++t.strstart<=n&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+ht-1])&t.hash_mask,a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart);while(0!==--t.prev_length);if(t.match_available=0,t.match_length=ht-1,t.strstart++,i&&(o(t,!1),0===t.strm.avail_out))return vt}else if(t.match_available){if(i=C._tr_tally(t,0,t.window[t.strstart-1]),i&&o(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return vt}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(i=C._tr_tally(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<ht-1?t.strstart:ht-1,e===F?(o(t,!0),0===t.strm.avail_out?yt:xt):t.last_lit&&(o(t,!1),0===t.strm.avail_out)?vt:kt}function g(t,e){for(var a,i,n,r,s=t.window;;){if(t.lookahead<=dt){if(_(t),t.lookahead<=dt&&e===I)return vt;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=ht&&t.strstart>0&&(n=t.strstart-1,i=s[n],i===s[++n]&&i===s[++n]&&i===s[++n])){r=t.strstart+dt;do;while(i===s[++n]&&i===s[++n]&&i===s[++n]&&i===s[++n]&&i===s[++n]&&i===s[++n]&&i===s[++n]&&i===s[++n]&&n<r);t.match_length=dt-(r-n),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=ht?(a=C._tr_tally(t,1,t.match_length-ht),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(a=C._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),a&&(o(t,!1),0===t.strm.avail_out))return vt}return t.insert=0,e===F?(o(t,!0),0===t.strm.avail_out?yt:xt):t.last_lit&&(o(t,!1),0===t.strm.avail_out)?vt:kt}function m(t,e){for(var a;;){if(0===t.lookahead&&(_(t),0===t.lookahead)){if(e===I)return vt;break}if(t.match_length=0,a=C._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,a&&(o(t,!1),0===t.strm.avail_out))return vt}return t.insert=0,e===F?(o(t,!0),0===t.strm.avail_out?yt:xt):t.last_lit&&(o(t,!1),0===t.strm.avail_out)?vt:kt}function w(t,e,a,i,n){this.good_length=t,this.max_lazy=e,this.nice_length=a,this.max_chain=i,this.func=n}function p(t){t.window_size=2*t.w_size,r(t.head),t.max_lazy_match=Z[t.level].max_lazy,t.good_match=Z[t.level].good_length,t.nice_match=Z[t.level].nice_length,t.max_chain_length=Z[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=ht-1,t.match_available=0,t.ins_h=0}function v(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=V,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new R.Buf16(2*ot),this.dyn_dtree=new R.Buf16(2*(2*rt+1)),this.bl_tree=new R.Buf16(2*(2*st+1)),r(this.dyn_ltree),r(this.dyn_dtree),r(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new R.Buf16(lt+1),this.heap=new R.Buf16(2*nt+1),r(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new R.Buf16(2*nt+1),r(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function k(t){var e;return t&&t.state?(t.total_in=t.total_out=0,t.data_type=Q,e=t.state,e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?ut:wt,t.adler=2===e.wrap?0:1,e.last_flush=I,C._tr_init(e),H):i(t,K)}function y(t){var e=k(t);return e===H&&p(t.state),e}function x(t,e){return t&&t.state?2!==t.state.wrap?K:(t.state.gzhead=e,H):K}function z(t,e,a,n,r,s){if(!t)return K;var o=1;if(e===Y&&(e=6),n<0?(o=0,n=-n):n>15&&(o=2,n-=16),r<1||r>$||a!==V||n<8||n>15||e<0||e>9||s<0||s>W)return i(t,K);8===n&&(n=9);var l=new v;return t.state=l,l.strm=t,l.wrap=o,l.gzhead=null,l.w_bits=n,l.w_size=1<<l.w_bits,l.w_mask=l.w_size-1,l.hash_bits=r+7,l.hash_size=1<<l.hash_bits,l.hash_mask=l.hash_size-1,l.hash_shift=~~((l.hash_bits+ht-1)/ht),l.window=new R.Buf8(2*l.w_size),l.head=new R.Buf16(l.hash_size),l.prev=new R.Buf16(l.w_size),l.lit_bufsize=1<<r+6,l.pending_buf_size=4*l.lit_bufsize,l.pending_buf=new R.Buf8(l.pending_buf_size),l.d_buf=1*l.lit_bufsize,l.l_buf=3*l.lit_bufsize,l.level=e,l.strategy=s,l.method=a,y(t)}function B(t,e){return z(t,e,V,tt,et,J)}function S(t,e){var a,o,d,f;if(!t||!t.state||e>L||e<0)return t?i(t,K):K;if(o=t.state,!t.output||!t.input&&0!==t.avail_in||o.status===pt&&e!==F)return i(t,0===t.avail_out?P:K);if(o.strm=t,a=o.last_flush,o.last_flush=e,o.status===ut)if(2===o.wrap)t.adler=0,l(o,31),l(o,139),l(o,8),o.gzhead?(l(o,(o.gzhead.text?1:0)+(o.gzhead.hcrc?2:0)+(o.gzhead.extra?4:0)+(o.gzhead.name?8:0)+(o.gzhead.comment?16:0)),l(o,255&o.gzhead.time),l(o,o.gzhead.time>>8&255),l(o,o.gzhead.time>>16&255),l(o,o.gzhead.time>>24&255),l(o,9===o.level?2:o.strategy>=G||o.level<2?4:0),l(o,255&o.gzhead.os),o.gzhead.extra&&o.gzhead.extra.length&&(l(o,255&o.gzhead.extra.length),l(o,o.gzhead.extra.length>>8&255)),o.gzhead.hcrc&&(t.adler=O(t.adler,o.pending_buf,o.pending,0)),o.gzindex=0,o.status=ct):(l(o,0),l(o,0),l(o,0),l(o,0),l(o,0),l(o,9===o.level?2:o.strategy>=G||o.level<2?4:0),l(o,zt),o.status=wt);else{var _=V+(o.w_bits-8<<4)<<8,u=-1;u=o.strategy>=G||o.level<2?0:o.level<6?1:6===o.level?2:3,_|=u<<6,0!==o.strstart&&(_|=_t),_+=31-_%31,o.status=wt,h(o,_),0!==o.strstart&&(h(o,t.adler>>>16),h(o,65535&t.adler)),t.adler=1}if(o.status===ct)if(o.gzhead.extra){for(d=o.pending;o.gzindex<(65535&o.gzhead.extra.length)&&(o.pending!==o.pending_buf_size||(o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),s(t),d=o.pending,o.pending!==o.pending_buf_size));)l(o,255&o.gzhead.extra[o.gzindex]),o.gzindex++;o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),o.gzindex===o.gzhead.extra.length&&(o.gzindex=0,o.status=bt)}else o.status=bt;if(o.status===bt)if(o.gzhead.name){d=o.pending;do{if(o.pending===o.pending_buf_size&&(o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),s(t),d=o.pending,o.pending===o.pending_buf_size)){f=1;break}f=o.gzindex<o.gzhead.name.length?255&o.gzhead.name.charCodeAt(o.gzindex++):0,l(o,f)}while(0!==f);o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),0===f&&(o.gzindex=0,o.status=gt)}else o.status=gt;if(o.status===gt)if(o.gzhead.comment){d=o.pending;do{if(o.pending===o.pending_buf_size&&(o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),s(t),d=o.pending,o.pending===o.pending_buf_size)){f=1;break}f=o.gzindex<o.gzhead.comment.length?255&o.gzhead.comment.charCodeAt(o.gzindex++):0,l(o,f)}while(0!==f);o.gzhead.hcrc&&o.pending>d&&(t.adler=O(t.adler,o.pending_buf,o.pending-d,d)),0===f&&(o.status=mt)}else o.status=mt;if(o.status===mt&&(o.gzhead.hcrc?(o.pending+2>o.pending_buf_size&&s(t),o.pending+2<=o.pending_buf_size&&(l(o,255&t.adler),l(o,t.adler>>8&255),t.adler=0,o.status=wt)):o.status=wt),0!==o.pending){if(s(t),0===t.avail_out)return o.last_flush=-1,H}else if(0===t.avail_in&&n(e)<=n(a)&&e!==F)return i(t,P);if(o.status===pt&&0!==t.avail_in)return i(t,P);if(0!==t.avail_in||0!==o.lookahead||e!==I&&o.status!==pt){var c=o.strategy===G?m(o,e):o.strategy===X?g(o,e):Z[o.level].func(o,e);if(c!==yt&&c!==xt||(o.status=pt),c===vt||c===yt)return 0===t.avail_out&&(o.last_flush=-1),H;if(c===kt&&(e===U?C._tr_align(o):e!==L&&(C._tr_stored_block(o,0,0,!1),e===T&&(r(o.head),0===o.lookahead&&(o.strstart=0,o.block_start=0,o.insert=0))),s(t),0===t.avail_out))return o.last_flush=-1,H}return e!==F?H:o.wrap<=0?j:(2===o.wrap?(l(o,255&t.adler),l(o,t.adler>>8&255),l(o,t.adler>>16&255),l(o,t.adler>>24&255),l(o,255&t.total_in),l(o,t.total_in>>8&255),l(o,t.total_in>>16&255),l(o,t.total_in>>24&255)):(h(o,t.adler>>>16),h(o,65535&t.adler)),s(t),o.wrap>0&&(o.wrap=-o.wrap),0!==o.pending?H:j)}function E(t){var e;return t&&t.state?(e=t.state.status,e!==ut&&e!==ct&&e!==bt&&e!==gt&&e!==mt&&e!==wt&&e!==pt?i(t,K):(t.state=null,e===wt?i(t,M):H)):K}function A(t,e){var a,i,n,s,o,l,h,d,f=e.length;if(!t||!t.state)return K;if(a=t.state,s=a.wrap,2===s||1===s&&a.status!==ut||a.lookahead)return K;for(1===s&&(t.adler=N(t.adler,e,f,0)),a.wrap=0,f>=a.w_size&&(0===s&&(r(a.head),a.strstart=0,a.block_start=0,a.insert=0),d=new R.Buf8(a.w_size),R.arraySet(d,e,f-a.w_size,a.w_size,0),e=d,f=a.w_size),o=t.avail_in,l=t.next_in,h=t.input,t.avail_in=f,t.next_in=0,t.input=e,_(a);a.lookahead>=ht;){i=a.strstart,n=a.lookahead-(ht-1);do a.ins_h=(a.ins_h<<a.hash_shift^a.window[i+ht-1])&a.hash_mask,a.prev[i&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=i,i++;while(--n);a.strstart=i,a.lookahead=ht-1,_(a)}return a.strstart+=a.lookahead,a.block_start=a.strstart,a.insert=a.lookahead,a.lookahead=0,a.match_length=a.prev_length=ht-1,a.match_available=0,t.next_in=l,t.input=h,t.avail_in=o,a.wrap=s,H}var Z,R=t("../utils/common"),C=t("./trees"),N=t("./adler32"),O=t("./crc32"),D=t("./messages"),I=0,U=1,T=3,F=4,L=5,H=0,j=1,K=-2,M=-3,P=-5,Y=-1,q=1,G=2,X=3,W=4,J=0,Q=2,V=8,$=9,tt=15,et=8,at=29,it=256,nt=it+1+at,rt=30,st=19,ot=2*nt+1,lt=15,ht=3,dt=258,ft=dt+ht+1,_t=32,ut=42,ct=69,bt=73,gt=91,mt=103,wt=113,pt=666,vt=1,kt=2,yt=3,xt=4,zt=3;Z=[new w(0,0,0,0,u),new w(4,4,8,4,c),new w(4,5,16,8,c),new w(4,6,32,32,c),new w(4,4,16,16,b),new w(8,16,32,32,b),new w(8,16,128,128,b),new w(8,32,128,256,b),new w(32,128,258,1024,b),new w(32,258,258,4096,b)],a.deflateInit=B,a.deflateInit2=z,a.deflateReset=y,a.deflateResetKeep=k,a.deflateSetHeader=x,a.deflate=S,a.deflateEnd=E,a.deflateSetDictionary=A,a.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":3,"./adler32":5,"./crc32":7,"./messages":13,"./trees":14}],9:[function(t,e,a){"use strict";function i(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}e.exports=i},{}],10:[function(t,e,a){"use strict";var i=30,n=12;e.exports=function(t,e){var a,r,s,o,l,h,d,f,_,u,c,b,g,m,w,p,v,k,y,x,z,B,S,E,A;a=t.state,r=t.next_in,E=t.input,s=r+(t.avail_in-5),o=t.next_out,A=t.output,l=o-(e-t.avail_out),h=o+(t.avail_out-257),d=a.dmax,f=a.wsize,_=a.whave,u=a.wnext,c=a.window,b=a.hold,g=a.bits,m=a.lencode,w=a.distcode,p=(1<<a.lenbits)-1,v=(1<<a.distbits)-1;t:do{g<15&&(b+=E[r++]<<g,g+=8,b+=E[r++]<<g,g+=8),k=m[b&p];e:for(;;){if(y=k>>>24,b>>>=y,g-=y,y=k>>>16&255,0===y)A[o++]=65535&k;else{if(!(16&y)){if(0===(64&y)){k=m[(65535&k)+(b&(1<<y)-1)];continue e}if(32&y){a.mode=n;break t}t.msg="invalid literal/length code",a.mode=i;break t}x=65535&k,y&=15,y&&(g<y&&(b+=E[r++]<<g,g+=8),x+=b&(1<<y)-1,b>>>=y,g-=y),g<15&&(b+=E[r++]<<g,g+=8,b+=E[r++]<<g,g+=8),k=w[b&v];a:for(;;){if(y=k>>>24,b>>>=y,g-=y,y=k>>>16&255,!(16&y)){if(0===(64&y)){k=w[(65535&k)+(b&(1<<y)-1)];continue a}t.msg="invalid distance code",a.mode=i;break t}if(z=65535&k,y&=15,g<y&&(b+=E[r++]<<g,g+=8,g<y&&(b+=E[r++]<<g,g+=8)),z+=b&(1<<y)-1,z>d){t.msg="invalid distance too far back",a.mode=i;break t}if(b>>>=y,g-=y,y=o-l,z>y){if(y=z-y,y>_&&a.sane){t.msg="invalid distance too far back",a.mode=i;break t}if(B=0,S=c,0===u){if(B+=f-y,y<x){x-=y;do A[o++]=c[B++];while(--y);B=o-z,S=A}}else if(u<y){if(B+=f+u-y,y-=u,y<x){x-=y;do A[o++]=c[B++];while(--y);if(B=0,u<x){y=u,x-=y;do A[o++]=c[B++];while(--y);B=o-z,S=A}}}else if(B+=u-y,y<x){x-=y;do A[o++]=c[B++];while(--y);B=o-z,S=A}for(;x>2;)A[o++]=S[B++],A[o++]=S[B++],A[o++]=S[B++],x-=3;x&&(A[o++]=S[B++],x>1&&(A[o++]=S[B++]))}else{B=o-z;do A[o++]=A[B++],A[o++]=A[B++],A[o++]=A[B++],x-=3;while(x>2);x&&(A[o++]=A[B++],x>1&&(A[o++]=A[B++]))}break}}break}}while(r<s&&o<h);x=g>>3,r-=x,g-=x<<3,b&=(1<<g)-1,t.next_in=r,t.next_out=o,t.avail_in=r<s?5+(s-r):5-(r-s),t.avail_out=o<h?257+(h-o):257-(o-h),a.hold=b,a.bits=g}},{}],11:[function(t,e,a){"use strict";function i(t){return(t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24)}function n(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new w.Buf16(320),this.work=new w.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function r(t){var e;return t&&t.state?(e=t.state,t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=T,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new w.Buf32(bt),e.distcode=e.distdyn=new w.Buf32(gt),e.sane=1,e.back=-1,Z):N}function s(t){var e;return t&&t.state?(e=t.state,e.wsize=0,e.whave=0,e.wnext=0,r(t)):N}function o(t,e){var a,i;return t&&t.state?(i=t.state,e<0?(a=0,e=-e):(a=(e>>4)+1,e<48&&(e&=15)),e&&(e<8||e>15)?N:(null!==i.window&&i.wbits!==e&&(i.window=null),i.wrap=a,i.wbits=e,s(t))):N}function l(t,e){var a,i;return t?(i=new n,t.state=i,i.window=null,a=o(t,e),a!==Z&&(t.state=null),a):N}function h(t){return l(t,wt)}function d(t){if(pt){var e;for(g=new w.Buf32(512),m=new w.Buf32(32),e=0;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(y(z,t.lens,0,288,g,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;y(B,t.lens,0,32,m,0,t.work,{bits:5}),pt=!1}t.lencode=g,t.lenbits=9,t.distcode=m,t.distbits=5}function f(t,e,a,i){var n,r=t.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new w.Buf8(r.wsize)),i>=r.wsize?(w.arraySet(r.window,e,a-r.wsize,r.wsize,0),r.wnext=0,r.whave=r.wsize):(n=r.wsize-r.wnext,n>i&&(n=i),w.arraySet(r.window,e,a-i,n,r.wnext),i-=n,i?(w.arraySet(r.window,e,a-i,i,0),r.wnext=i,r.whave=r.wsize):(r.wnext+=n,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=n))),0}function _(t,e){var a,n,r,s,o,l,h,_,u,c,b,g,m,bt,gt,mt,wt,pt,vt,kt,yt,xt,zt,Bt,St=0,Et=new w.Buf8(4),At=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!t||!t.state||!t.output||!t.input&&0!==t.avail_in)return N;a=t.state,a.mode===X&&(a.mode=W),o=t.next_out,r=t.output,h=t.avail_out,s=t.next_in,n=t.input,l=t.avail_in,_=a.hold,u=a.bits,c=l,b=h,xt=Z;t:for(;;)switch(a.mode){case T:if(0===a.wrap){a.mode=W;break}for(;u<16;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(2&a.wrap&&35615===_){a.check=0,Et[0]=255&_,Et[1]=_>>>8&255,a.check=v(a.check,Et,2,0),_=0,u=0,a.mode=F;break}if(a.flags=0,a.head&&(a.head.done=!1),!(1&a.wrap)||(((255&_)<<8)+(_>>8))%31){t.msg="incorrect header check",a.mode=_t;break}if((15&_)!==U){t.msg="unknown compression method",a.mode=_t;break}if(_>>>=4,u-=4,yt=(15&_)+8,0===a.wbits)a.wbits=yt;else if(yt>a.wbits){t.msg="invalid window size",a.mode=_t;break}a.dmax=1<<yt,t.adler=a.check=1,a.mode=512&_?q:X,_=0,u=0;break;case F:for(;u<16;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(a.flags=_,(255&a.flags)!==U){t.msg="unknown compression method",a.mode=_t;break}if(57344&a.flags){t.msg="unknown header flags set",a.mode=_t;break}a.head&&(a.head.text=_>>8&1),512&a.flags&&(Et[0]=255&_,Et[1]=_>>>8&255,a.check=v(a.check,Et,2,0)),_=0,u=0,a.mode=L;case L:for(;u<32;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.head&&(a.head.time=_),512&a.flags&&(Et[0]=255&_,Et[1]=_>>>8&255,Et[2]=_>>>16&255,Et[3]=_>>>24&255,a.check=v(a.check,Et,4,0)),_=0,u=0,a.mode=H;case H:for(;u<16;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.head&&(a.head.xflags=255&_,a.head.os=_>>8),512&a.flags&&(Et[0]=255&_,Et[1]=_>>>8&255,a.check=v(a.check,Et,2,0)),_=0,u=0,a.mode=j;case j:if(1024&a.flags){for(;u<16;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.length=_,a.head&&(a.head.extra_len=_),512&a.flags&&(Et[0]=255&_,Et[1]=_>>>8&255,a.check=v(a.check,Et,2,0)),_=0,u=0}else a.head&&(a.head.extra=null);a.mode=K;case K:if(1024&a.flags&&(g=a.length,g>l&&(g=l),g&&(a.head&&(yt=a.head.extra_len-a.length,a.head.extra||(a.head.extra=new Array(a.head.extra_len)),w.arraySet(a.head.extra,n,s,g,yt)),512&a.flags&&(a.check=v(a.check,n,g,s)),l-=g,s+=g,a.length-=g),a.length))break t;a.length=0,a.mode=M;case M:if(2048&a.flags){if(0===l)break t;g=0;do yt=n[s+g++],a.head&&yt&&a.length<65536&&(a.head.name+=String.fromCharCode(yt));while(yt&&g<l);if(512&a.flags&&(a.check=v(a.check,n,g,s)),l-=g,s+=g,yt)break t}else a.head&&(a.head.name=null);a.length=0,a.mode=P;case P:if(4096&a.flags){if(0===l)break t;g=0;do yt=n[s+g++],a.head&&yt&&a.length<65536&&(a.head.comment+=String.fromCharCode(yt));while(yt&&g<l);if(512&a.flags&&(a.check=v(a.check,n,g,s)),l-=g,s+=g,yt)break t}else a.head&&(a.head.comment=null);a.mode=Y;case Y:if(512&a.flags){for(;u<16;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(_!==(65535&a.check)){t.msg="header crc mismatch",a.mode=_t;break}_=0,u=0}a.head&&(a.head.hcrc=a.flags>>9&1,a.head.done=!0),t.adler=a.check=0,a.mode=X;break;case q:for(;u<32;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}t.adler=a.check=i(_),_=0,u=0,a.mode=G;case G:if(0===a.havedict)return t.next_out=o,t.avail_out=h,t.next_in=s,t.avail_in=l,a.hold=_,a.bits=u,C;t.adler=a.check=1,a.mode=X;case X:if(e===E||e===A)break t;case W:if(a.last){_>>>=7&u,u-=7&u,a.mode=ht;break}for(;u<3;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}switch(a.last=1&_,_>>>=1,u-=1,3&_){case 0:a.mode=J;break;case 1:if(d(a),a.mode=at,e===A){_>>>=2,u-=2;break t}break;case 2:a.mode=$;break;case 3:t.msg="invalid block type",a.mode=_t}_>>>=2,u-=2;break;case J:for(_>>>=7&u,u-=7&u;u<32;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if((65535&_)!==(_>>>16^65535)){t.msg="invalid stored block lengths",a.mode=_t;break}if(a.length=65535&_,_=0,u=0,a.mode=Q,e===A)break t;case Q:a.mode=V;case V:if(g=a.length){if(g>l&&(g=l),g>h&&(g=h),0===g)break t;w.arraySet(r,n,s,g,o),l-=g,s+=g,h-=g,o+=g,a.length-=g;break}a.mode=X;break;case $:
for(;u<14;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(a.nlen=(31&_)+257,_>>>=5,u-=5,a.ndist=(31&_)+1,_>>>=5,u-=5,a.ncode=(15&_)+4,_>>>=4,u-=4,a.nlen>286||a.ndist>30){t.msg="too many length or distance symbols",a.mode=_t;break}a.have=0,a.mode=tt;case tt:for(;a.have<a.ncode;){for(;u<3;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.lens[At[a.have++]]=7&_,_>>>=3,u-=3}for(;a.have<19;)a.lens[At[a.have++]]=0;if(a.lencode=a.lendyn,a.lenbits=7,zt={bits:a.lenbits},xt=y(x,a.lens,0,19,a.lencode,0,a.work,zt),a.lenbits=zt.bits,xt){t.msg="invalid code lengths set",a.mode=_t;break}a.have=0,a.mode=et;case et:for(;a.have<a.nlen+a.ndist;){for(;St=a.lencode[_&(1<<a.lenbits)-1],gt=St>>>24,mt=St>>>16&255,wt=65535&St,!(gt<=u);){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(wt<16)_>>>=gt,u-=gt,a.lens[a.have++]=wt;else{if(16===wt){for(Bt=gt+2;u<Bt;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(_>>>=gt,u-=gt,0===a.have){t.msg="invalid bit length repeat",a.mode=_t;break}yt=a.lens[a.have-1],g=3+(3&_),_>>>=2,u-=2}else if(17===wt){for(Bt=gt+3;u<Bt;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}_>>>=gt,u-=gt,yt=0,g=3+(7&_),_>>>=3,u-=3}else{for(Bt=gt+7;u<Bt;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}_>>>=gt,u-=gt,yt=0,g=11+(127&_),_>>>=7,u-=7}if(a.have+g>a.nlen+a.ndist){t.msg="invalid bit length repeat",a.mode=_t;break}for(;g--;)a.lens[a.have++]=yt}}if(a.mode===_t)break;if(0===a.lens[256]){t.msg="invalid code -- missing end-of-block",a.mode=_t;break}if(a.lenbits=9,zt={bits:a.lenbits},xt=y(z,a.lens,0,a.nlen,a.lencode,0,a.work,zt),a.lenbits=zt.bits,xt){t.msg="invalid literal/lengths set",a.mode=_t;break}if(a.distbits=6,a.distcode=a.distdyn,zt={bits:a.distbits},xt=y(B,a.lens,a.nlen,a.ndist,a.distcode,0,a.work,zt),a.distbits=zt.bits,xt){t.msg="invalid distances set",a.mode=_t;break}if(a.mode=at,e===A)break t;case at:a.mode=it;case it:if(l>=6&&h>=258){t.next_out=o,t.avail_out=h,t.next_in=s,t.avail_in=l,a.hold=_,a.bits=u,k(t,b),o=t.next_out,r=t.output,h=t.avail_out,s=t.next_in,n=t.input,l=t.avail_in,_=a.hold,u=a.bits,a.mode===X&&(a.back=-1);break}for(a.back=0;St=a.lencode[_&(1<<a.lenbits)-1],gt=St>>>24,mt=St>>>16&255,wt=65535&St,!(gt<=u);){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(mt&&0===(240&mt)){for(pt=gt,vt=mt,kt=wt;St=a.lencode[kt+((_&(1<<pt+vt)-1)>>pt)],gt=St>>>24,mt=St>>>16&255,wt=65535&St,!(pt+gt<=u);){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}_>>>=pt,u-=pt,a.back+=pt}if(_>>>=gt,u-=gt,a.back+=gt,a.length=wt,0===mt){a.mode=lt;break}if(32&mt){a.back=-1,a.mode=X;break}if(64&mt){t.msg="invalid literal/length code",a.mode=_t;break}a.extra=15&mt,a.mode=nt;case nt:if(a.extra){for(Bt=a.extra;u<Bt;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.length+=_&(1<<a.extra)-1,_>>>=a.extra,u-=a.extra,a.back+=a.extra}a.was=a.length,a.mode=rt;case rt:for(;St=a.distcode[_&(1<<a.distbits)-1],gt=St>>>24,mt=St>>>16&255,wt=65535&St,!(gt<=u);){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(0===(240&mt)){for(pt=gt,vt=mt,kt=wt;St=a.distcode[kt+((_&(1<<pt+vt)-1)>>pt)],gt=St>>>24,mt=St>>>16&255,wt=65535&St,!(pt+gt<=u);){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}_>>>=pt,u-=pt,a.back+=pt}if(_>>>=gt,u-=gt,a.back+=gt,64&mt){t.msg="invalid distance code",a.mode=_t;break}a.offset=wt,a.extra=15&mt,a.mode=st;case st:if(a.extra){for(Bt=a.extra;u<Bt;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}a.offset+=_&(1<<a.extra)-1,_>>>=a.extra,u-=a.extra,a.back+=a.extra}if(a.offset>a.dmax){t.msg="invalid distance too far back",a.mode=_t;break}a.mode=ot;case ot:if(0===h)break t;if(g=b-h,a.offset>g){if(g=a.offset-g,g>a.whave&&a.sane){t.msg="invalid distance too far back",a.mode=_t;break}g>a.wnext?(g-=a.wnext,m=a.wsize-g):m=a.wnext-g,g>a.length&&(g=a.length),bt=a.window}else bt=r,m=o-a.offset,g=a.length;g>h&&(g=h),h-=g,a.length-=g;do r[o++]=bt[m++];while(--g);0===a.length&&(a.mode=it);break;case lt:if(0===h)break t;r[o++]=a.length,h--,a.mode=it;break;case ht:if(a.wrap){for(;u<32;){if(0===l)break t;l--,_|=n[s++]<<u,u+=8}if(b-=h,t.total_out+=b,a.total+=b,b&&(t.adler=a.check=a.flags?v(a.check,r,b,o-b):p(a.check,r,b,o-b)),b=h,(a.flags?_:i(_))!==a.check){t.msg="incorrect data check",a.mode=_t;break}_=0,u=0}a.mode=dt;case dt:if(a.wrap&&a.flags){for(;u<32;){if(0===l)break t;l--,_+=n[s++]<<u,u+=8}if(_!==(4294967295&a.total)){t.msg="incorrect length check",a.mode=_t;break}_=0,u=0}a.mode=ft;case ft:xt=R;break t;case _t:xt=O;break t;case ut:return D;case ct:default:return N}return t.next_out=o,t.avail_out=h,t.next_in=s,t.avail_in=l,a.hold=_,a.bits=u,(a.wsize||b!==t.avail_out&&a.mode<_t&&(a.mode<ht||e!==S))&&f(t,t.output,t.next_out,b-t.avail_out)?(a.mode=ut,D):(c-=t.avail_in,b-=t.avail_out,t.total_in+=c,t.total_out+=b,a.total+=b,a.wrap&&b&&(t.adler=a.check=a.flags?v(a.check,r,b,t.next_out-b):p(a.check,r,b,t.next_out-b)),t.data_type=a.bits+(a.last?64:0)+(a.mode===X?128:0)+(a.mode===at||a.mode===Q?256:0),(0===c&&0===b||e===S)&&xt===Z&&(xt=I),xt)}function u(t){if(!t||!t.state)return N;var e=t.state;return e.window&&(e.window=null),t.state=null,Z}function c(t,e){var a;return t&&t.state?(a=t.state,0===(2&a.wrap)?N:(a.head=e,e.done=!1,Z)):N}function b(t,e){var a,i,n,r=e.length;return t&&t.state?(a=t.state,0!==a.wrap&&a.mode!==G?N:a.mode===G&&(i=1,i=p(i,e,r,0),i!==a.check)?O:(n=f(t,e,r,r))?(a.mode=ut,D):(a.havedict=1,Z)):N}var g,m,w=t("../utils/common"),p=t("./adler32"),v=t("./crc32"),k=t("./inffast"),y=t("./inftrees"),x=0,z=1,B=2,S=4,E=5,A=6,Z=0,R=1,C=2,N=-2,O=-3,D=-4,I=-5,U=8,T=1,F=2,L=3,H=4,j=5,K=6,M=7,P=8,Y=9,q=10,G=11,X=12,W=13,J=14,Q=15,V=16,$=17,tt=18,et=19,at=20,it=21,nt=22,rt=23,st=24,ot=25,lt=26,ht=27,dt=28,ft=29,_t=30,ut=31,ct=32,bt=852,gt=592,mt=15,wt=mt,pt=!0;a.inflateReset=s,a.inflateReset2=o,a.inflateResetKeep=r,a.inflateInit=h,a.inflateInit2=l,a.inflate=_,a.inflateEnd=u,a.inflateGetHeader=c,a.inflateSetDictionary=b,a.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":3,"./adler32":5,"./crc32":7,"./inffast":10,"./inftrees":12}],12:[function(t,e,a){"use strict";var i=t("../utils/common"),n=15,r=852,s=592,o=0,l=1,h=2,d=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],f=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],_=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],u=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(t,e,a,c,b,g,m,w){var p,v,k,y,x,z,B,S,E,A=w.bits,Z=0,R=0,C=0,N=0,O=0,D=0,I=0,U=0,T=0,F=0,L=null,H=0,j=new i.Buf16(n+1),K=new i.Buf16(n+1),M=null,P=0;for(Z=0;Z<=n;Z++)j[Z]=0;for(R=0;R<c;R++)j[e[a+R]]++;for(O=A,N=n;N>=1&&0===j[N];N--);if(O>N&&(O=N),0===N)return b[g++]=20971520,b[g++]=20971520,w.bits=1,0;for(C=1;C<N&&0===j[C];C++);for(O<C&&(O=C),U=1,Z=1;Z<=n;Z++)if(U<<=1,U-=j[Z],U<0)return-1;if(U>0&&(t===o||1!==N))return-1;for(K[1]=0,Z=1;Z<n;Z++)K[Z+1]=K[Z]+j[Z];for(R=0;R<c;R++)0!==e[a+R]&&(m[K[e[a+R]]++]=R);if(t===o?(L=M=m,z=19):t===l?(L=d,H-=257,M=f,P-=257,z=256):(L=_,M=u,z=-1),F=0,R=0,Z=C,x=g,D=O,I=0,k=-1,T=1<<O,y=T-1,t===l&&T>r||t===h&&T>s)return 1;for(;;){B=Z-I,m[R]<z?(S=0,E=m[R]):m[R]>z?(S=M[P+m[R]],E=L[H+m[R]]):(S=96,E=0),p=1<<Z-I,v=1<<D,C=v;do v-=p,b[x+(F>>I)+v]=B<<24|S<<16|E|0;while(0!==v);for(p=1<<Z-1;F&p;)p>>=1;if(0!==p?(F&=p-1,F+=p):F=0,R++,0===--j[Z]){if(Z===N)break;Z=e[a+m[R]]}if(Z>O&&(F&y)!==k){for(0===I&&(I=O),x+=C,D=Z-I,U=1<<D;D+I<N&&(U-=j[D+I],!(U<=0));)D++,U<<=1;if(T+=1<<D,t===l&&T>r||t===h&&T>s)return 1;k=F&y,b[k]=O<<24|D<<16|x-g|0}}return 0!==F&&(b[x+F]=Z-I<<24|64<<16|0),w.bits=O,0}},{"../utils/common":3}],13:[function(t,e,a){"use strict";e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],14:[function(t,e,a){"use strict";function i(t){for(var e=t.length;--e>=0;)t[e]=0}function n(t,e,a,i,n){this.static_tree=t,this.extra_bits=e,this.extra_base=a,this.elems=i,this.max_length=n,this.has_stree=t&&t.length}function r(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}function s(t){return t<256?lt[t]:lt[256+(t>>>7)]}function o(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255}function l(t,e,a){t.bi_valid>W-a?(t.bi_buf|=e<<t.bi_valid&65535,o(t,t.bi_buf),t.bi_buf=e>>W-t.bi_valid,t.bi_valid+=a-W):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=a)}function h(t,e,a){l(t,a[2*e],a[2*e+1])}function d(t,e){var a=0;do a|=1&t,t>>>=1,a<<=1;while(--e>0);return a>>>1}function f(t){16===t.bi_valid?(o(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}function _(t,e){var a,i,n,r,s,o,l=e.dyn_tree,h=e.max_code,d=e.stat_desc.static_tree,f=e.stat_desc.has_stree,_=e.stat_desc.extra_bits,u=e.stat_desc.extra_base,c=e.stat_desc.max_length,b=0;for(r=0;r<=X;r++)t.bl_count[r]=0;for(l[2*t.heap[t.heap_max]+1]=0,a=t.heap_max+1;a<G;a++)i=t.heap[a],r=l[2*l[2*i+1]+1]+1,r>c&&(r=c,b++),l[2*i+1]=r,i>h||(t.bl_count[r]++,s=0,i>=u&&(s=_[i-u]),o=l[2*i],t.opt_len+=o*(r+s),f&&(t.static_len+=o*(d[2*i+1]+s)));if(0!==b){do{for(r=c-1;0===t.bl_count[r];)r--;t.bl_count[r]--,t.bl_count[r+1]+=2,t.bl_count[c]--,b-=2}while(b>0);for(r=c;0!==r;r--)for(i=t.bl_count[r];0!==i;)n=t.heap[--a],n>h||(l[2*n+1]!==r&&(t.opt_len+=(r-l[2*n+1])*l[2*n],l[2*n+1]=r),i--)}}function u(t,e,a){var i,n,r=new Array(X+1),s=0;for(i=1;i<=X;i++)r[i]=s=s+a[i-1]<<1;for(n=0;n<=e;n++){var o=t[2*n+1];0!==o&&(t[2*n]=d(r[o]++,o))}}function c(){var t,e,a,i,r,s=new Array(X+1);for(a=0,i=0;i<K-1;i++)for(dt[i]=a,t=0;t<1<<et[i];t++)ht[a++]=i;for(ht[a-1]=i,r=0,i=0;i<16;i++)for(ft[i]=r,t=0;t<1<<at[i];t++)lt[r++]=i;for(r>>=7;i<Y;i++)for(ft[i]=r<<7,t=0;t<1<<at[i]-7;t++)lt[256+r++]=i;for(e=0;e<=X;e++)s[e]=0;for(t=0;t<=143;)st[2*t+1]=8,t++,s[8]++;for(;t<=255;)st[2*t+1]=9,t++,s[9]++;for(;t<=279;)st[2*t+1]=7,t++,s[7]++;for(;t<=287;)st[2*t+1]=8,t++,s[8]++;for(u(st,P+1,s),t=0;t<Y;t++)ot[2*t+1]=5,ot[2*t]=d(t,5);_t=new n(st,et,M+1,P,X),ut=new n(ot,at,0,Y,X),ct=new n(new Array(0),it,0,q,J)}function b(t){var e;for(e=0;e<P;e++)t.dyn_ltree[2*e]=0;for(e=0;e<Y;e++)t.dyn_dtree[2*e]=0;for(e=0;e<q;e++)t.bl_tree[2*e]=0;t.dyn_ltree[2*Q]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0}function g(t){t.bi_valid>8?o(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0}function m(t,e,a,i){g(t),i&&(o(t,a),o(t,~a)),N.arraySet(t.pending_buf,t.window,e,a,t.pending),t.pending+=a}function w(t,e,a,i){var n=2*e,r=2*a;return t[n]<t[r]||t[n]===t[r]&&i[e]<=i[a]}function p(t,e,a){for(var i=t.heap[a],n=a<<1;n<=t.heap_len&&(n<t.heap_len&&w(e,t.heap[n+1],t.heap[n],t.depth)&&n++,!w(e,i,t.heap[n],t.depth));)t.heap[a]=t.heap[n],a=n,n<<=1;t.heap[a]=i}function v(t,e,a){var i,n,r,o,d=0;if(0!==t.last_lit)do i=t.pending_buf[t.d_buf+2*d]<<8|t.pending_buf[t.d_buf+2*d+1],n=t.pending_buf[t.l_buf+d],d++,0===i?h(t,n,e):(r=ht[n],h(t,r+M+1,e),o=et[r],0!==o&&(n-=dt[r],l(t,n,o)),i--,r=s(i),h(t,r,a),o=at[r],0!==o&&(i-=ft[r],l(t,i,o)));while(d<t.last_lit);h(t,Q,e)}function k(t,e){var a,i,n,r=e.dyn_tree,s=e.stat_desc.static_tree,o=e.stat_desc.has_stree,l=e.stat_desc.elems,h=-1;for(t.heap_len=0,t.heap_max=G,a=0;a<l;a++)0!==r[2*a]?(t.heap[++t.heap_len]=h=a,t.depth[a]=0):r[2*a+1]=0;for(;t.heap_len<2;)n=t.heap[++t.heap_len]=h<2?++h:0,r[2*n]=1,t.depth[n]=0,t.opt_len--,o&&(t.static_len-=s[2*n+1]);for(e.max_code=h,a=t.heap_len>>1;a>=1;a--)p(t,r,a);n=l;do a=t.heap[1],t.heap[1]=t.heap[t.heap_len--],p(t,r,1),i=t.heap[1],t.heap[--t.heap_max]=a,t.heap[--t.heap_max]=i,r[2*n]=r[2*a]+r[2*i],t.depth[n]=(t.depth[a]>=t.depth[i]?t.depth[a]:t.depth[i])+1,r[2*a+1]=r[2*i+1]=n,t.heap[1]=n++,p(t,r,1);while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],_(t,e),u(r,h,t.bl_count)}function y(t,e,a){var i,n,r=-1,s=e[1],o=0,l=7,h=4;for(0===s&&(l=138,h=3),e[2*(a+1)+1]=65535,i=0;i<=a;i++)n=s,s=e[2*(i+1)+1],++o<l&&n===s||(o<h?t.bl_tree[2*n]+=o:0!==n?(n!==r&&t.bl_tree[2*n]++,t.bl_tree[2*V]++):o<=10?t.bl_tree[2*$]++:t.bl_tree[2*tt]++,o=0,r=n,0===s?(l=138,h=3):n===s?(l=6,h=3):(l=7,h=4))}function x(t,e,a){var i,n,r=-1,s=e[1],o=0,d=7,f=4;for(0===s&&(d=138,f=3),i=0;i<=a;i++)if(n=s,s=e[2*(i+1)+1],!(++o<d&&n===s)){if(o<f){do h(t,n,t.bl_tree);while(0!==--o)}else 0!==n?(n!==r&&(h(t,n,t.bl_tree),o--),h(t,V,t.bl_tree),l(t,o-3,2)):o<=10?(h(t,$,t.bl_tree),l(t,o-3,3)):(h(t,tt,t.bl_tree),l(t,o-11,7));o=0,r=n,0===s?(d=138,f=3):n===s?(d=6,f=3):(d=7,f=4)}}function z(t){var e;for(y(t,t.dyn_ltree,t.l_desc.max_code),y(t,t.dyn_dtree,t.d_desc.max_code),k(t,t.bl_desc),e=q-1;e>=3&&0===t.bl_tree[2*nt[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}function B(t,e,a,i){var n;for(l(t,e-257,5),l(t,a-1,5),l(t,i-4,4),n=0;n<i;n++)l(t,t.bl_tree[2*nt[n]+1],3);x(t,t.dyn_ltree,e-1),x(t,t.dyn_dtree,a-1)}function S(t){var e,a=4093624447;for(e=0;e<=31;e++,a>>>=1)if(1&a&&0!==t.dyn_ltree[2*e])return D;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return I;for(e=32;e<M;e++)if(0!==t.dyn_ltree[2*e])return I;return D}function E(t){bt||(c(),bt=!0),t.l_desc=new r(t.dyn_ltree,_t),t.d_desc=new r(t.dyn_dtree,ut),t.bl_desc=new r(t.bl_tree,ct),t.bi_buf=0,t.bi_valid=0,b(t)}function A(t,e,a,i){l(t,(T<<1)+(i?1:0),3),m(t,e,a,!0)}function Z(t){l(t,F<<1,3),h(t,Q,st),f(t)}function R(t,e,a,i){var n,r,s=0;t.level>0?(t.strm.data_type===U&&(t.strm.data_type=S(t)),k(t,t.l_desc),k(t,t.d_desc),s=z(t),n=t.opt_len+3+7>>>3,r=t.static_len+3+7>>>3,r<=n&&(n=r)):n=r=a+5,a+4<=n&&e!==-1?A(t,e,a,i):t.strategy===O||r===n?(l(t,(F<<1)+(i?1:0),3),v(t,st,ot)):(l(t,(L<<1)+(i?1:0),3),B(t,t.l_desc.max_code+1,t.d_desc.max_code+1,s+1),v(t,t.dyn_ltree,t.dyn_dtree)),b(t),i&&g(t)}function C(t,e,a){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&a,t.last_lit++,0===e?t.dyn_ltree[2*a]++:(t.matches++,e--,t.dyn_ltree[2*(ht[a]+M+1)]++,t.dyn_dtree[2*s(e)]++),t.last_lit===t.lit_bufsize-1}var N=t("../utils/common"),O=4,D=0,I=1,U=2,T=0,F=1,L=2,H=3,j=258,K=29,M=256,P=M+1+K,Y=30,q=19,G=2*P+1,X=15,W=16,J=7,Q=256,V=16,$=17,tt=18,et=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],at=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],it=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],nt=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],rt=512,st=new Array(2*(P+2));i(st);var ot=new Array(2*Y);i(ot);var lt=new Array(rt);i(lt);var ht=new Array(j-H+1);i(ht);var dt=new Array(K);i(dt);var ft=new Array(Y);i(ft);var _t,ut,ct,bt=!1;a._tr_init=E,a._tr_stored_block=A,a._tr_flush_block=R,a._tr_tally=C,a._tr_align=Z},{"../utils/common":3}],15:[function(t,e,a){"use strict";function i(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}e.exports=i},{}],"/":[function(t,e,a){"use strict";var i=t("./lib/utils/common").assign,n=t("./lib/deflate"),r=t("./lib/inflate"),s=t("./lib/zlib/constants"),o={};i(o,n,r,s),e.exports=o},{"./lib/deflate":1,"./lib/inflate":2,"./lib/utils/common":3,"./lib/zlib/constants":6}]},{},[])("/")});
/**
 * @license
 * Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var PDFJS;

(function(PDFJS) {
    "use strict";
	
var JpegError = (function JpegErrorClosure() {
  function JpegError(msg) {
    this.message = 'JPEG error: ' + msg;
  }

  JpegError.prototype = new Error();
  JpegError.prototype.name = 'JpegError';
  JpegError.constructor = JpegError;

  return JpegError;
})();

	var JpegImage = (function JpegImageClosure() {
  var dctZigZag = new Uint8Array([
     0,
     1,  8,
    16,  9,  2,
     3, 10, 17, 24,
    32, 25, 18, 11, 4,
     5, 12, 19, 26, 33, 40,
    48, 41, 34, 27, 20, 13,  6,
     7, 14, 21, 28, 35, 42, 49, 56,
    57, 50, 43, 36, 29, 22, 15,
    23, 30, 37, 44, 51, 58,
    59, 52, 45, 38, 31,
    39, 46, 53, 60,
    61, 54, 47,
    55, 62,
    63
  ]);

  var dctCos1  =  4017;   // cos(pi/16)
  var dctSin1  =   799;   // sin(pi/16)
  var dctCos3  =  3406;   // cos(3*pi/16)
  var dctSin3  =  2276;   // sin(3*pi/16)
  var dctCos6  =  1567;   // cos(6*pi/16)
  var dctSin6  =  3784;   // sin(6*pi/16)
  var dctSqrt2 =  5793;   // sqrt(2)
  var dctSqrt1d2 = 2896;  // sqrt(2) / 2

   function JpegImage(pms) {
		if(pms==null) pms={}
	   if(pms.decodeTransform==null) pms.decodeTransform=null;
	   if(pms.colorTransform==null) pms.colorTransform=-1;
    this._decodeTransform = pms.decodeTransform;
    this._colorTransform = pms.colorTransform;
  }

  function buildHuffmanTable(codeLengths, values) {
    var k = 0, code = [], i, j, length = 16;
    while (length > 0 && !codeLengths[length - 1]) {
      length--;
    }
    code.push({ children: [], index: 0, });
    var p = code[0], q;
    for (i = 0; i < length; i++) {
      for (j = 0; j < codeLengths[i]; j++) {
        p = code.pop();
        p.children[p.index] = values[k];
        while (p.index > 0) {
          p = code.pop();
        }
        p.index++;
        code.push(p);
        while (code.length <= i) {
          code.push(q = { children: [], index: 0, });
          p.children[p.index] = q.children;
          p = q;
        }
        k++;
      }
      if (i + 1 < length) {
        // p here points to last code
        code.push(q = { children: [], index: 0, });
        p.children[p.index] = q.children;
        p = q;
      }
    }
    return code[0].children;
  }

  function getBlockBufferOffset(component, row, col) {
    return 64 * ((component.blocksPerLine + 1) * row + col);
  }

  function decodeScan(data, offset, frame, components, resetInterval,
                      spectralStart, spectralEnd, successivePrev, successive,
                      parseDNLMarker) {
	if(parseDNLMarker==null) parseDNLMarker=false;
    var mcusPerLine = frame.mcusPerLine;
    var progressive = frame.progressive;

    var startOffset = offset, bitsData = 0, bitsCount = 0;

    function readBit() {
      if (bitsCount > 0) {
        bitsCount--;
        return (bitsData >> bitsCount) & 1;
      }
      bitsData = data[offset++];
      if (bitsData === 0xFF) {
        var nextByte = data[offset++];
        if (nextByte) {
          if (nextByte === 0xDC && parseDNLMarker) { // DNL == 0xFFDC
            offset += 2; // Skip data length.
            var scanLines = (data[offset++] << 8) | data[offset++];
            if (scanLines > 0 && scanLines !== frame.scanLines) {
              throw new DNLMarkerError(
                'Found DNL marker (0xFFDC) while parsing scan data', scanLines);
            }
          } else if (nextByte === 0xD9) { // EOI == 0xFFD9
            throw new EOIMarkerError(
              'Found EOI marker (0xFFD9) while parsing scan data');
          }
          throw new JpegError(
            "unexpected marker "+((bitsData << 8) | nextByte).toString(16));
        }
        // unstuff 0
      }
      bitsCount = 7;
      return bitsData >>> 7;
    }

    function decodeHuffman(tree) {
      var node = tree;
      while (true) {
        node = node[readBit()];
        if (typeof node === 'number') {
          return node;
        }
        if (typeof node !== 'object') {
          throw new JpegError('invalid huffman sequence');
        }
      }
    }

    function receive(length) {
      var n = 0;
      while (length > 0) {
        n = (n << 1) | readBit();
        length--;
      }
      return n;
    }

    function receiveAndExtend(length) {
      if (length === 1) {
        return readBit() === 1 ? 1 : -1;
      }
      var n = receive(length);
      if (n >= 1 << (length - 1)) {
        return n;
      }
      return n + (-1 << length) + 1;
    }

    function decodeBaseline(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : receiveAndExtend(t);
      component.blockData[offset] = (component.pred += diff);
      var k = 1;
      while (k < 64) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] = receiveAndExtend(s);
        k++;
      }
    }

    function decodeDCFirst(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
      component.blockData[offset] = (component.pred += diff);
    }

    function decodeDCSuccessive(component, offset) {
      component.blockData[offset] |= readBit() << successive;
    }

    var eobrun = 0;
    function decodeACFirst(component, offset) {
      if (eobrun > 0) {
        eobrun--;
        return;
      }
      var k = spectralStart, e = spectralEnd;
      while (k <= e) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            eobrun = receive(r) + (1 << r) - 1;
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] =
          receiveAndExtend(s) * (1 << successive);
        k++;
      }
    }

    var successiveACState = 0, successiveACNextValue;
    function decodeACSuccessive(component, offset) {
      var k = spectralStart;
      var e = spectralEnd;
      var r = 0;
      var s;
      var rs;
      while (k <= e) {
        var offsetZ = offset + dctZigZag[k];
        var sign = component.blockData[offsetZ] < 0 ? -1 : 1;
        switch (successiveACState) {
          case 0: // initial state
            rs = decodeHuffman(component.huffmanTableAC);
            s = rs & 15;
            r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r);
                successiveACState = 4;
              } else {
                r = 16;
                successiveACState = 1;
              }
            } else {
              if (s !== 1) {
                throw new JpegError('invalid ACn encoding');
              }
              successiveACNextValue = receiveAndExtend(s);
              successiveACState = r ? 2 : 3;
            }
            continue;
          case 1: // skipping r zero items
          case 2:
            if (component.blockData[offsetZ]) {
              component.blockData[offsetZ] += sign * (readBit() << successive);
            } else {
              r--;
              if (r === 0) {
                successiveACState = successiveACState === 2 ? 3 : 0;
              }
            }
            break;
          case 3: // set value for a zero item
            if (component.blockData[offsetZ]) {
              component.blockData[offsetZ] += sign * (readBit() << successive);
            } else {
              component.blockData[offsetZ] =
                successiveACNextValue << successive;
              successiveACState = 0;
            }
            break;
          case 4: // eob
            if (component.blockData[offsetZ]) {
              component.blockData[offsetZ] += sign * (readBit() << successive);
            }
            break;
        }
        k++;
      }
      if (successiveACState === 4) {
        eobrun--;
        if (eobrun === 0) {
          successiveACState = 0;
        }
      }
    }

    function decodeMcu(component, decode, mcu, row, col) {
      var mcuRow = (mcu / mcusPerLine) | 0;
      var mcuCol = mcu % mcusPerLine;
      var blockRow = mcuRow * component.v + row;
      var blockCol = mcuCol * component.h + col;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    function decodeBlock(component, decode, mcu) {
      var blockRow = (mcu / component.blocksPerLine) | 0;
      var blockCol = mcu % component.blocksPerLine;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    var componentsLength = components.length;
    var component, i, j, k, n;
    var decodeFn;
    if (progressive) {
      if (spectralStart === 0) {
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
      } else {
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
      }
    } else {
      decodeFn = decodeBaseline;
    }

    var mcu = 0, fileMarker;
    var mcuExpected;
    if (componentsLength === 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
    } else {
      mcuExpected = mcusPerLine * frame.mcusPerColumn;
    }

    var h, v;
    while (mcu < mcuExpected) {
      // reset interval stuff
      var mcuToRead = resetInterval ?
        Math.min(mcuExpected - mcu, resetInterval) : mcuExpected;
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0;
      }
      eobrun = 0;

      if (componentsLength === 1) {
        component = components[0];
        for (n = 0; n < mcuToRead; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < mcuToRead; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;
        }
      }

      // find marker
      bitsCount = 0;
      fileMarker = findNextFileMarker(data, offset);
      // Some bad images seem to pad Scan blocks with e.g. zero bytes, skip past
      // those to attempt to find a valid marker (fixes issue4090.pdf).
      if (fileMarker && fileMarker.invalid) {
        warn('decodeScan - unexpected MCU data, current marker is: ' +
             fileMarker.invalid);
        offset = fileMarker.offset;
      }
      var marker = fileMarker && fileMarker.marker;
      if (!marker || marker <= 0xFF00) {
        throw new JpegError('marker was not found');
      }

      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
        offset += 2;
      } else {
        break;
      }
    }

    fileMarker = findNextFileMarker(data, offset);
    // Some images include more Scan blocks than expected, skip past those and
    // attempt to find the next valid marker (fixes issue8182.pdf).
    if (fileMarker && fileMarker.invalid) {
      warn('decodeScan - unexpected Scan data, current marker is: ' +
           fileMarker.invalid);
      offset = fileMarker.offset;
    }

    return offset - startOffset;
  }

  // A port of poppler's IDCT method which in turn is taken from:
  //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
  //   'Practical Fast 1-D DCT Algorithms with 11 Multiplications',
  //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
  //   988-991.
  function quantizeAndInverse(component, blockBufferOffset, p) {
    var qt = component.quantizationTable, blockData = component.blockData;
    var v0, v1, v2, v3, v4, v5, v6, v7;
    var p0, p1, p2, p3, p4, p5, p6, p7;
    var t;

    if (!qt) {
      throw new JpegError('missing required Quantization Table.');
    }

    // inverse DCT on rows
    for (var row = 0; row < 64; row += 8) {
      // gather block data
      p0 = blockData[blockBufferOffset + row];
      p1 = blockData[blockBufferOffset + row + 1];
      p2 = blockData[blockBufferOffset + row + 2];
      p3 = blockData[blockBufferOffset + row + 3];
      p4 = blockData[blockBufferOffset + row + 4];
      p5 = blockData[blockBufferOffset + row + 5];
      p6 = blockData[blockBufferOffset + row + 6];
      p7 = blockData[blockBufferOffset + row + 7];

      // dequant p0
      p0 *= qt[row];

      // check for all-zero AC coefficients
      if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
        t = (dctSqrt2 * p0 + 512) >> 10;
        p[row] = t;
        p[row + 1] = t;
        p[row + 2] = t;
        p[row + 3] = t;
        p[row + 4] = t;
        p[row + 5] = t;
        p[row + 6] = t;
        p[row + 7] = t;
        continue;
      }
      // dequant p1 ... p7
      p1 *= qt[row + 1];
      p2 *= qt[row + 2];
      p3 *= qt[row + 3];
      p4 *= qt[row + 4];
      p5 *= qt[row + 5];
      p6 *= qt[row + 6];
      p7 *= qt[row + 7];

      // stage 4
      v0 = (dctSqrt2 * p0 + 128) >> 8;
      v1 = (dctSqrt2 * p4 + 128) >> 8;
      v2 = p2;
      v3 = p6;
      v4 = (dctSqrt1d2 * (p1 - p7) + 128) >> 8;
      v7 = (dctSqrt1d2 * (p1 + p7) + 128) >> 8;
      v5 = p3 << 4;
      v6 = p5 << 4;

      // stage 3
      v0 = (v0 + v1 + 1) >> 1;
      v1 = v0 - v1;
      t  = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
      v3 = t;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = v4 - v6;
      v7 = (v7 + v5 + 1) >> 1;
      v5 = v7 - v5;

      // stage 2
      v0 = (v0 + v3 + 1) >> 1;
      v3 = v0 - v3;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = v1 - v2;
      t  = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t  = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[row] = v0 + v7;
      p[row + 7] = v0 - v7;
      p[row + 1] = v1 + v6;
      p[row + 6] = v1 - v6;
      p[row + 2] = v2 + v5;
      p[row + 5] = v2 - v5;
      p[row + 3] = v3 + v4;
      p[row + 4] = v3 - v4;
    }

    // inverse DCT on columns
    for (var col = 0; col < 8; ++col) {
      p0 = p[col];
      p1 = p[col +  8];
      p2 = p[col + 16];
      p3 = p[col + 24];
      p4 = p[col + 32];
      p5 = p[col + 40];
      p6 = p[col + 48];
      p7 = p[col + 56];

      // check for all-zero AC coefficients
      if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
        t = (dctSqrt2 * p0 + 8192) >> 14;
        // convert to 8 bit
        t = (t < -2040) ? 0 : (t >= 2024) ? 255 : (t + 2056) >> 4;
        blockData[blockBufferOffset + col] = t;
        blockData[blockBufferOffset + col +  8] = t;
        blockData[blockBufferOffset + col + 16] = t;
        blockData[blockBufferOffset + col + 24] = t;
        blockData[blockBufferOffset + col + 32] = t;
        blockData[blockBufferOffset + col + 40] = t;
        blockData[blockBufferOffset + col + 48] = t;
        blockData[blockBufferOffset + col + 56] = t;
        continue;
      }

      // stage 4
      v0 = (dctSqrt2 * p0 + 2048) >> 12;
      v1 = (dctSqrt2 * p4 + 2048) >> 12;
      v2 = p2;
      v3 = p6;
      v4 = (dctSqrt1d2 * (p1 - p7) + 2048) >> 12;
      v7 = (dctSqrt1d2 * (p1 + p7) + 2048) >> 12;
      v5 = p3;
      v6 = p5;

      // stage 3
      // Shift v0 by 128.5 << 5 here, so we don't need to shift p0...p7 when
      // converting to UInt8 range later.
      v0 = ((v0 + v1 + 1) >> 1) + 4112;
      v1 = v0 - v1;
      t  = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
      v3 = t;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = v4 - v6;
      v7 = (v7 + v5 + 1) >> 1;
      v5 = v7 - v5;

      // stage 2
      v0 = (v0 + v3 + 1) >> 1;
      v3 = v0 - v3;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = v1 - v2;
      t  = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t  = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p0 = v0 + v7;
      p7 = v0 - v7;
      p1 = v1 + v6;
      p6 = v1 - v6;
      p2 = v2 + v5;
      p5 = v2 - v5;
      p3 = v3 + v4;
      p4 = v3 - v4;

      // convert to 8-bit integers
      p0 = (p0 < 16) ? 0 : (p0 >= 4080) ? 255 : p0 >> 4;
      p1 = (p1 < 16) ? 0 : (p1 >= 4080) ? 255 : p1 >> 4;
      p2 = (p2 < 16) ? 0 : (p2 >= 4080) ? 255 : p2 >> 4;
      p3 = (p3 < 16) ? 0 : (p3 >= 4080) ? 255 : p3 >> 4;
      p4 = (p4 < 16) ? 0 : (p4 >= 4080) ? 255 : p4 >> 4;
      p5 = (p5 < 16) ? 0 : (p5 >= 4080) ? 255 : p5 >> 4;
      p6 = (p6 < 16) ? 0 : (p6 >= 4080) ? 255 : p6 >> 4;
      p7 = (p7 < 16) ? 0 : (p7 >= 4080) ? 255 : p7 >> 4;

      // store block data
      blockData[blockBufferOffset + col] = p0;
      blockData[blockBufferOffset + col +  8] = p1;
      blockData[blockBufferOffset + col + 16] = p2;
      blockData[blockBufferOffset + col + 24] = p3;
      blockData[blockBufferOffset + col + 32] = p4;
      blockData[blockBufferOffset + col + 40] = p5;
      blockData[blockBufferOffset + col + 48] = p6;
      blockData[blockBufferOffset + col + 56] = p7;
    }
  }

  function buildComponentData(frame, component) {
    var blocksPerLine = component.blocksPerLine;
    var blocksPerColumn = component.blocksPerColumn;
    var computationBuffer = new Int16Array(64);

    for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
      for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
        var offset = getBlockBufferOffset(component, blockRow, blockCol);
        quantizeAndInverse(component, offset, computationBuffer);
      }
    }
    return component.blockData;
  }

  function findNextFileMarker(data, currentPos, startPos) {
	  if(startPos==null) startPos=currentPos;
    function peekUint16(pos) {
      return (data[pos] << 8) | data[pos + 1];
    }

    var maxPos = data.length - 1;
    var newPos = startPos < currentPos ? startPos : currentPos;

    if (currentPos >= maxPos) {
      return null; // Don't attempt to read non-existent data and just return.
    }
    var currentMarker = peekUint16(currentPos);
    if (currentMarker >= 0xFFC0 && currentMarker <= 0xFFFE) {
      return {
        invalid: null,
        marker: currentMarker,
        offset: currentPos,
      };
    }
    var newMarker = peekUint16(newPos);
    while (!(newMarker >= 0xFFC0 && newMarker <= 0xFFFE)) {
      if (++newPos >= maxPos) {
        return null; // Don't attempt to read non-existent data and just return.
      }
      newMarker = peekUint16(newPos);
    }
    return {
      invalid: currentMarker.toString(16),
      marker: newMarker,
      offset: newPos,
    };
  }

  JpegImage.prototype = {
    parse: function(data, pms) {
		if(pms==null) pms={};
		var dnlScanLines = pms.dnlScanLines;

      function readUint16() {
        var value = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        return value;
      }

      function readDataBlock() {
        var length = readUint16();
        var endOffset = offset + length - 2;

        var fileMarker = findNextFileMarker(data, endOffset, offset);
        if (fileMarker && fileMarker.invalid) {
          warn('readDataBlock - incorrect length, current marker is: ' +
               fileMarker.invalid);
          endOffset = fileMarker.offset;
        }

        var array = data.subarray(offset, endOffset);
        offset += array.length;
        return array;
      }

      function prepareComponents(frame) {
        var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / frame.maxH);
        var mcusPerColumn = Math.ceil(frame.scanLines / 8 / frame.maxV);
        for (var i = 0; i < frame.components.length; i++) {
          component = frame.components[i];
          var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) *
                                        component.h / frame.maxH);
          var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) *
                                          component.v / frame.maxV);
          var blocksPerLineForMcu = mcusPerLine * component.h;
          var blocksPerColumnForMcu = mcusPerColumn * component.v;

          var blocksBufferSize = 64 * blocksPerColumnForMcu *
                                      (blocksPerLineForMcu + 1);
          component.blockData = new Int16Array(blocksBufferSize);
          component.blocksPerLine = blocksPerLine;
          component.blocksPerColumn = blocksPerColumn;
        }
        frame.mcusPerLine = mcusPerLine;
        frame.mcusPerColumn = mcusPerColumn;
      }

      var offset = 0;
      var jfif = null;
      var adobe = null;
      var frame, resetInterval;
      var numSOSMarkers = 0;
      var quantizationTables = [];
      var huffmanTablesAC = [], huffmanTablesDC = [];
      var fileMarker = readUint16();
      if (fileMarker !== 0xFFD8) { // SOI (Start of Image)
        throw new JpegError('SOI not found');
      }

      fileMarker = readUint16();
      markerLoop: while (fileMarker !== 0xFFD9) { // EOI (End of image)
        var i, j, l;
        switch (fileMarker) {
          case 0xFFE0: // APP0 (Application Specific)
          case 0xFFE1: // APP1
          case 0xFFE2: // APP2
          case 0xFFE3: // APP3
          case 0xFFE4: // APP4
          case 0xFFE5: // APP5
          case 0xFFE6: // APP6
          case 0xFFE7: // APP7
          case 0xFFE8: // APP8
          case 0xFFE9: // APP9
          case 0xFFEA: // APP10
          case 0xFFEB: // APP11
          case 0xFFEC: // APP12
          case 0xFFED: // APP13
          case 0xFFEE: // APP14
          case 0xFFEF: // APP15
          case 0xFFFE: // COM (Comment)
            var appData = readDataBlock();

            if (fileMarker === 0xFFE0) {
              if (appData[0] === 0x4A && appData[1] === 0x46 &&
                  appData[2] === 0x49 && appData[3] === 0x46 &&
                  appData[4] === 0) { // 'JFIF\x00'
                jfif = {
                  version: { major: appData[5], minor: appData[6], },
                  densityUnits: appData[7],
                  xDensity: (appData[8] << 8) | appData[9],
                  yDensity: (appData[10] << 8) | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 +
                                              3 * appData[12] * appData[13]),
                };
              }
            }
            // TODO APP1 - Exif
            if (fileMarker === 0xFFEE) {
              if (appData[0] === 0x41 && appData[1] === 0x64 &&
                  appData[2] === 0x6F && appData[3] === 0x62 &&
                  appData[4] === 0x65) { // 'Adobe'
                adobe = {
                  version: (appData[5] << 8) | appData[6],
                  flags0: (appData[7] << 8) | appData[8],
                  flags1: (appData[9] << 8) | appData[10],
                  transformCode: appData[11],
                };
              }
            }
            break;

          case 0xFFDB: // DQT (Define Quantization Tables)
            var quantizationTablesLength = readUint16();
            var quantizationTablesEnd = quantizationTablesLength + offset - 2;
            var z;
            while (offset < quantizationTablesEnd) {
              var quantizationTableSpec = data[offset++];
              var tableData = new Uint16Array(64);
              if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
                for (j = 0; j < 64; j++) {
                  z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if ((quantizationTableSpec >> 4) === 1) { // 16 bit values
                for (j = 0; j < 64; j++) {
                  z = dctZigZag[j];
                  tableData[z] = readUint16();
                }
              } else {
                throw new JpegError('DQT - invalid table spec');
              }
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;

          case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
          case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
          case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
            if (frame) {
              throw new JpegError('Only single frame JPEGs supported');
            }
            readUint16(); // skip data length
            frame = {};
            frame.extended = (fileMarker === 0xFFC1);
            frame.progressive = (fileMarker === 0xFFC2);
            frame.precision = data[offset++];
            var sofScanLines = readUint16();
            frame.scanLines = dnlScanLines || sofScanLines;
            frame.samplesPerLine = readUint16();
            frame.components = [];
            frame.componentIds = {};
            var componentsCount = data[offset++], componentId;
            var maxH = 0, maxV = 0;
            for (i = 0; i < componentsCount; i++) {
              componentId = data[offset];
              var h = data[offset + 1] >> 4;
              var v = data[offset + 1] & 15;
              if (maxH < h) {
                maxH = h;
              }
              if (maxV < v) {
                maxV = v;
              }
              var qId = data[offset + 2];
              l = frame.components.push({
                h:h,
                v:v,
                quantizationId: qId,
                quantizationTable: null, // See comment below.
              });
              frame.componentIds[componentId] = l - 1;
              offset += 3;
            }
            frame.maxH = maxH;
            frame.maxV = maxV;
            prepareComponents(frame);
            break;

          case 0xFFC4: // DHT (Define Huffman Tables)
            var huffmanLength = readUint16();
            for (i = 2; i < huffmanLength;) {
              var huffmanTableSpec = data[offset++];
              var codeLengths = new Uint8Array(16);
              var codeLengthSum = 0;
              for (j = 0; j < 16; j++, offset++) {
                codeLengthSum += (codeLengths[j] = data[offset]);
              }
              var huffmanValues = new Uint8Array(codeLengthSum);
              for (j = 0; j < codeLengthSum; j++, offset++) {
                huffmanValues[j] = data[offset];
              }
              i += 17 + codeLengthSum;

              ((huffmanTableSpec >> 4) === 0 ?
                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
                buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;

          case 0xFFDD: // DRI (Define Restart Interval)
            readUint16(); // skip data length
            resetInterval = readUint16();
            break;

          case 0xFFDA: // SOS (Start of Scan)
            // A DNL marker (0xFFDC), if it exists, is only allowed at the end
            // of the first scan segment and may only occur once in an image.
            // Furthermore, to prevent an infinite loop, do *not* attempt to
            // parse DNL markers during re-parsing of the JPEG scan data.
            var parseDNLMarker = (++numSOSMarkers) === 1 && !dnlScanLines;

            readUint16(); // scanLength
            var selectorsCount = data[offset++];
            var components = [], component;
            for (i = 0; i < selectorsCount; i++) {
              var componentIndex = frame.componentIds[data[offset++]];
              component = frame.components[componentIndex];
              var tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            var spectralStart = data[offset++];
            var spectralEnd = data[offset++];
            var successiveApproximation = data[offset++];
            try {
              var processed = decodeScan(data, offset,
                frame, components, resetInterval,
                spectralStart, spectralEnd,
                successiveApproximation >> 4, successiveApproximation & 15,
                parseDNLMarker);
              offset += processed;
            } catch (ex) {
              if (ex instanceof DNLMarkerError) {
                warn(ex.message+" -- attempting to re-parse the JPEG image.");
                return this.parse(data, { dnlScanLines: ex.scanLines, });
              } else if (ex instanceof EOIMarkerError) {
                warn(ex.message+" -- ignoring the rest of the image data.");
                break markerLoop;
              }
              throw ex;
            }
            break;

          case 0xFFDC: // DNL (Define Number of Lines)
            // Ignore the marker, since it's being handled in `decodeScan`.
            offset += 4;
            break;

          case 0xFFFF: // Fill bytes
            if (data[offset] !== 0xFF) { // Avoid skipping a valid marker.
              offset--;
            }
            break;

          default:
            if (data[offset - 3] === 0xFF &&
                data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
              // could be incorrect encoding -- last 0xFF byte of the previous
              // block was eaten by the encoder
              offset -= 3;
              break;
            }
            var nextFileMarker = findNextFileMarker(data, offset - 2);
            if (nextFileMarker && nextFileMarker.invalid) {
              warn('JpegImage.parse - unexpected data, current marker is: ' +
                   nextFileMarker.invalid);
              offset = nextFileMarker.offset;
              break;
            }
            throw new JpegError('unknown marker ' + fileMarker.toString(16));
        }
        fileMarker = readUint16();
      }

      this.width = frame.samplesPerLine;
      this.height = frame.scanLines;
      this.jfif = jfif;
      this.adobe = adobe;
      this.components = [];
      for (i = 0; i < frame.components.length; i++) {
        component = frame.components[i];

        // Prevent errors when DQT markers are placed after SOF{n} markers,
        // by assigning the `quantizationTable` entry after the entire image
        // has been parsed (fixes issue7406.pdf).
        var quantizationTable = quantizationTables[component.quantizationId];
        if (quantizationTable) {
          component.quantizationTable = quantizationTable;
        }

        this.components.push({
          output: buildComponentData(frame, component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV,
          blocksPerLine: component.blocksPerLine,
          blocksPerColumn: component.blocksPerColumn,
        });
      }
      this.numComponents = this.components.length;
    },

    _getLinearizedBlockData: function(width, height, isSourcePDF) {
		if(isSourcePDF==null) isSourcePDF=false;
      var scaleX = this.width / width, scaleY = this.height / height;

      var component, componentScaleX, componentScaleY, blocksPerScanline;
      var x, y, i, j, k;
      var index;
      var offset = 0;
      var output;
      var numComponents = this.components.length;
      var dataLength = width * height * numComponents;
      var data = new Uint8ClampedArray(dataLength);
      var xScaleBlockOffset = new Uint32Array(width);
      var mask3LSB = 0xfffffff8; // used to clear the 3 LSBs

      for (i = 0; i < numComponents; i++) {
        component = this.components[i];
        componentScaleX = component.scaleX * scaleX;
        componentScaleY = component.scaleY * scaleY;
        offset = i;
        output = component.output;
        blocksPerScanline = (component.blocksPerLine + 1) << 3;
        // precalculate the xScaleBlockOffset
        for (x = 0; x < width; x++) {
          j = 0 | (x * componentScaleX);
          xScaleBlockOffset[x] = ((j & mask3LSB) << 3) | (j & 7);
        }
        // linearize the blocks of the component
        for (y = 0; y < height; y++) {
          j = 0 | (y * componentScaleY);
          index = blocksPerScanline * (j & mask3LSB) | ((j & 7) << 3);
          for (x = 0; x < width; x++) {
            data[offset] = output[index + xScaleBlockOffset[x]];
            offset += numComponents;
          }
        }
      }

      // decodeTransform contains pairs of multiplier (-256..256) and additive
      var transform = this._decodeTransform;

      // In PDF files, JPEG images with CMYK colour spaces are usually inverted
      // (this can be observed by extracting the raw image data).
      // Since the conversion algorithms (see below) were written primarily for
      // the PDF use-cases, attempting to use `JpegImage` to parse standalone
      // JPEG (CMYK) images may thus result in inverted images (see issue 9513).
      //
      // Unfortunately it's not (always) possible to tell, from the image data
      // alone, if it needs to be inverted. Thus in an attempt to provide better
      // out-of-box behaviour when `JpegImage` is used standalone, default to
      // inverting JPEG (CMYK) images if and only if the image data does *not*
      // come from a PDF file and no `decodeTransform` was passed by the user.
      if (!transform && numComponents === 4 && !isSourcePDF) {
        transform = new Int32Array([
          -256, 255, -256, 255, -256, 255, -256, 255]);
      }

      if (transform) {
        for (i = 0; i < dataLength;) {
          for (j = 0, k = 0; j < numComponents; j++, i++, k += 2) {
            data[i] = ((data[i] * transform[k]) >> 8) + transform[k + 1];
          }
        }
      }
      return data;
    },

    get _isColorConversionNeeded() {
      if (this.adobe) {
        // The adobe transform marker overrides any previous setting.
        return !!this.adobe.transformCode;
      }
      if (this.numComponents === 3) {
        if (this._colorTransform === 0) {
          // If the Adobe transform marker is not present and the image
          // dictionary has a 'ColorTransform' entry, explicitly set to `0`,
          // then the colours should *not* be transformed.
          return false;
        }
        return true;
      }
      // `this.numComponents !== 3`
      if (this._colorTransform === 1) {
        // If the Adobe transform marker is not present and the image
        // dictionary has a 'ColorTransform' entry, explicitly set to `1`,
        // then the colours should be transformed.
        return true;
      }
      return false;
    },

    _convertYccToRgb: function convertYccToRgb(data) {
      var Y, Cb, Cr;
      for (var i = 0, length = data.length; i < length; i += 3) {
        Y = data[i];
        Cb = data[i + 1];
        Cr = data[i + 2];
        data[i] = Y - 179.456 + 1.402 * Cr;
        data[i + 1] = Y + 135.459 - 0.344 * Cb - 0.714 * Cr;
        data[i + 2] = Y - 226.816 + 1.772 * Cb;
      }
      return data;
    },

    _convertYcckToRgb: function convertYcckToRgb(data) {
      var Y, Cb, Cr, k;
      var offset = 0;
      for (var i = 0, length = data.length; i < length; i += 4) {
        Y = data[i];
        Cb = data[i + 1];
        Cr = data[i + 2];
        k = data[i + 3];

        data[offset++] = -122.67195406894 +
          Cb * (-6.60635669420364e-5 * Cb + 0.000437130475926232 * Cr -
                5.4080610064599e-5 * Y + 0.00048449797120281 * k -
                0.154362151871126) +
          Cr * (-0.000957964378445773 * Cr + 0.000817076911346625 * Y -
                0.00477271405408747 * k + 1.53380253221734) +
          Y * (0.000961250184130688 * Y - 0.00266257332283933 * k +
               0.48357088451265) +
          k * (-0.000336197177618394 * k + 0.484791561490776);

        data[offset++] = 107.268039397724 +
          Cb * (2.19927104525741e-5 * Cb - 0.000640992018297945 * Cr +
                0.000659397001245577 * Y + 0.000426105652938837 * k -
                0.176491792462875) +
          Cr * (-0.000778269941513683 * Cr + 0.00130872261408275 * Y +
                0.000770482631801132 * k - 0.151051492775562) +
          Y * (0.00126935368114843 * Y - 0.00265090189010898 * k +
               0.25802910206845) +
          k * (-0.000318913117588328 * k - 0.213742400323665);

        data[offset++] = -20.810012546947 +
          Cb * (-0.000570115196973677 * Cb - 2.63409051004589e-5 * Cr +
                0.0020741088115012 * Y - 0.00288260236853442 * k +
                0.814272968359295) +
          Cr * (-1.53496057440975e-5 * Cr - 0.000132689043961446 * Y +
                0.000560833691242812 * k - 0.195152027534049) +
          Y * (0.00174418132927582 * Y - 0.00255243321439347 * k +
               0.116935020465145) +
          k * (-0.000343531996510555 * k + 0.24165260232407);
      }
      // Ensure that only the converted RGB data is returned.
      return data.subarray(0, offset);
    },

    _convertYcckToCmyk: function convertYcckToCmyk(data) {
      var Y, Cb, Cr;
      for (var i = 0, length = data.length; i < length; i += 4) {
        Y = data[i];
        Cb = data[i + 1];
        Cr = data[i + 2];
        data[i] = 434.456 - Y - 1.402 * Cr;
        data[i + 1] = 119.541 - Y + 0.344 * Cb + 0.714 * Cr;
        data[i + 2] = 481.816 - Y - 1.772 * Cb;
        // K in data[i + 3] is unchanged
      }
      return data;
    },

    _convertCmykToRgb: function convertCmykToRgb(data) {
      var c, m, y, k;
      var offset = 0;
      var scale = 1 / 255;
      for (var i = 0, length = data.length; i < length; i += 4) {
        c = data[i] * scale;
        m = data[i + 1] * scale;
        y = data[i + 2] * scale;
        k = data[i + 3] * scale;

        data[offset++] = 255 +
          c * (-4.387332384609988 * c + 54.48615194189176 * m +
               18.82290502165302 * y + 212.25662451639585 * k -
               285.2331026137004) +
          m * (1.7149763477362134 * m - 5.6096736904047315 * y -
               17.873870861415444 * k - 5.497006427196366) +
          y * (-2.5217340131683033 * y - 21.248923337353073 * k +
               17.5119270841813) -
          k * (21.86122147463605 * k + 189.48180835922747);

        data[offset++] = 255 +
          c * (8.841041422036149 * c + 60.118027045597366 * m +
               6.871425592049007 * y + 31.159100130055922 * k -
               79.2970844816548) +
          m * (-15.310361306967817 * m + 17.575251261109482 * y +
               131.35250912493976 * k - 190.9453302588951) +
          y * (4.444339102852739 * y + 9.8632861493405 * k -
               24.86741582555878) -
          k * (20.737325471181034 * k + 187.80453709719578);

        data[offset++] = 255 +
          c * (0.8842522430003296 * c + 8.078677503112928 * m +
               30.89978309703729 * y - 0.23883238689178934 * k -
               14.183576799673286) +
          m * (10.49593273432072 * m + 63.02378494754052 * y +
               50.606957656360734 * k - 112.23884253719248) +
          y * (0.03296041114873217 * y + 115.60384449646641 * k -
               193.58209356861505) -
          k * (22.33816807309886 * k + 180.12613974708367);
      }
      // Ensure that only the converted RGB data is returned.
      return data.subarray(0, offset);
    },

    getData: function(pms) {
		if(pms==null) pms={};
		var width=pms.width, height=pms.height, forceRGB=pms.forceRGB!=null?pms.forceRGB:false, isSourcePDF=pms.isSourcePDF!=null?pms.isSourcePDF:false;
      if (this.numComponents > 4) {
        throw new JpegError('Unsupported color mode');
      }
      // Type of data: Uint8ClampedArray(width * height * numComponents)
      var data = this._getLinearizedBlockData(width, height, isSourcePDF);

      if (this.numComponents === 1 && forceRGB) {
        var dataLength = data.length;
        var rgbData = new Uint8ClampedArray(dataLength * 3);
        var offset = 0;
        for (var i = 0; i < dataLength; i++) {
          var grayColor = data[i];
          rgbData[offset++] = grayColor;
          rgbData[offset++] = grayColor;
          rgbData[offset++] = grayColor;
        }
        return rgbData;
      } else if (this.numComponents === 3 && this._isColorConversionNeeded) {
        return this._convertYccToRgb(data);
      } else if (this.numComponents === 4) {
        if (this._isColorConversionNeeded) {
          if (forceRGB) {
            return this._convertYcckToRgb(data);
          }
          return this._convertYcckToCmyk(data);
        } else if (forceRGB) {
          return this._convertCmykToRgb(data);
        }
      }
      return data;
    },
  };

  return JpegImage;
})();
	
	
	"use strict";
    var ArithmeticDecoder = function ArithmeticDecoderClosure() {
  var QeTable = [{
    qe: 0x5601,
    nmps: 1,
    nlps: 1,
    switchFlag: 1
  }, {
    qe: 0x3401,
    nmps: 2,
    nlps: 6,
    switchFlag: 0
  }, {
    qe: 0x1801,
    nmps: 3,
    nlps: 9,
    switchFlag: 0
  }, {
    qe: 0x0AC1,
    nmps: 4,
    nlps: 12,
    switchFlag: 0
  }, {
    qe: 0x0521,
    nmps: 5,
    nlps: 29,
    switchFlag: 0
  }, {
    qe: 0x0221,
    nmps: 38,
    nlps: 33,
    switchFlag: 0
  }, {
    qe: 0x5601,
    nmps: 7,
    nlps: 6,
    switchFlag: 1
  }, {
    qe: 0x5401,
    nmps: 8,
    nlps: 14,
    switchFlag: 0
  }, {
    qe: 0x4801,
    nmps: 9,
    nlps: 14,
    switchFlag: 0
  }, {
    qe: 0x3801,
    nmps: 10,
    nlps: 14,
    switchFlag: 0
  }, {
    qe: 0x3001,
    nmps: 11,
    nlps: 17,
    switchFlag: 0
  }, {
    qe: 0x2401,
    nmps: 12,
    nlps: 18,
    switchFlag: 0
  }, {
    qe: 0x1C01,
    nmps: 13,
    nlps: 20,
    switchFlag: 0
  }, {
    qe: 0x1601,
    nmps: 29,
    nlps: 21,
    switchFlag: 0
  }, {
    qe: 0x5601,
    nmps: 15,
    nlps: 14,
    switchFlag: 1
  }, {
    qe: 0x5401,
    nmps: 16,
    nlps: 14,
    switchFlag: 0
  }, {
    qe: 0x5101,
    nmps: 17,
    nlps: 15,
    switchFlag: 0
  }, {
    qe: 0x4801,
    nmps: 18,
    nlps: 16,
    switchFlag: 0
  }, {
    qe: 0x3801,
    nmps: 19,
    nlps: 17,
    switchFlag: 0
  }, {
    qe: 0x3401,
    nmps: 20,
    nlps: 18,
    switchFlag: 0
  }, {
    qe: 0x3001,
    nmps: 21,
    nlps: 19,
    switchFlag: 0
  }, {
    qe: 0x2801,
    nmps: 22,
    nlps: 19,
    switchFlag: 0
  }, {
    qe: 0x2401,
    nmps: 23,
    nlps: 20,
    switchFlag: 0
  }, {
    qe: 0x2201,
    nmps: 24,
    nlps: 21,
    switchFlag: 0
  }, {
    qe: 0x1C01,
    nmps: 25,
    nlps: 22,
    switchFlag: 0
  }, {
    qe: 0x1801,
    nmps: 26,
    nlps: 23,
    switchFlag: 0
  }, {
    qe: 0x1601,
    nmps: 27,
    nlps: 24,
    switchFlag: 0
  }, {
    qe: 0x1401,
    nmps: 28,
    nlps: 25,
    switchFlag: 0
  }, {
    qe: 0x1201,
    nmps: 29,
    nlps: 26,
    switchFlag: 0
  }, {
    qe: 0x1101,
    nmps: 30,
    nlps: 27,
    switchFlag: 0
  }, {
    qe: 0x0AC1,
    nmps: 31,
    nlps: 28,
    switchFlag: 0
  }, {
    qe: 0x09C1,
    nmps: 32,
    nlps: 29,
    switchFlag: 0
  }, {
    qe: 0x08A1,
    nmps: 33,
    nlps: 30,
    switchFlag: 0
  }, {
    qe: 0x0521,
    nmps: 34,
    nlps: 31,
    switchFlag: 0
  }, {
    qe: 0x0441,
    nmps: 35,
    nlps: 32,
    switchFlag: 0
  }, {
    qe: 0x02A1,
    nmps: 36,
    nlps: 33,
    switchFlag: 0
  }, {
    qe: 0x0221,
    nmps: 37,
    nlps: 34,
    switchFlag: 0
  }, {
    qe: 0x0141,
    nmps: 38,
    nlps: 35,
    switchFlag: 0
  }, {
    qe: 0x0111,
    nmps: 39,
    nlps: 36,
    switchFlag: 0
  }, {
    qe: 0x0085,
    nmps: 40,
    nlps: 37,
    switchFlag: 0
  }, {
    qe: 0x0049,
    nmps: 41,
    nlps: 38,
    switchFlag: 0
  }, {
    qe: 0x0025,
    nmps: 42,
    nlps: 39,
    switchFlag: 0
  }, {
    qe: 0x0015,
    nmps: 43,
    nlps: 40,
    switchFlag: 0
  }, {
    qe: 0x0009,
    nmps: 44,
    nlps: 41,
    switchFlag: 0
  }, {
    qe: 0x0005,
    nmps: 45,
    nlps: 42,
    switchFlag: 0
  }, {
    qe: 0x0001,
    nmps: 45,
    nlps: 43,
    switchFlag: 0
  }, {
    qe: 0x5601,
    nmps: 46,
    nlps: 46,
    switchFlag: 0
  }];
  function ArithmeticDecoder(data, start, end) {
    this.data = data;
    this.bp = start;
    this.dataEnd = end;
    this.chigh = data[start];
    this.clow = 0;
    this.byteIn();
    this.chigh = this.chigh << 7 & 0xFFFF | this.clow >> 9 & 0x7F;
    this.clow = this.clow << 7 & 0xFFFF;
    this.ct -= 7;
    this.a = 0x8000;
  }
  ArithmeticDecoder.prototype = {
    byteIn: function ArithmeticDecoder_byteIn() {
      var data = this.data;
      var bp = this.bp;
      if (data[bp] === 0xFF) {
        var b1 = data[bp + 1];
        if (b1 > 0x8F) {
          this.clow += 0xFF00;
          this.ct = 8;
        } else {
          bp++;
          this.clow += data[bp] << 9;
          this.ct = 7;
          this.bp = bp;
        }
      } else {
        bp++;
        this.clow += bp < this.dataEnd ? data[bp] << 8 : 0xFF00;
        this.ct = 8;
        this.bp = bp;
      }
      if (this.clow > 0xFFFF) {
        this.chigh += this.clow >> 16;
        this.clow &= 0xFFFF;
      }
    },
    readBit: function ArithmeticDecoder_readBit(contexts, pos) {
      var cx_index = contexts[pos] >> 1,
          cx_mps = contexts[pos] & 1;
      var qeTableIcx = QeTable[cx_index];
      var qeIcx = qeTableIcx.qe;
      var d;
      var a = this.a - qeIcx;
      if (this.chigh < qeIcx) {
        if (a < qeIcx) {
          a = qeIcx;
          d = cx_mps;
          cx_index = qeTableIcx.nmps;
        } else {
          a = qeIcx;
          d = 1 ^ cx_mps;
          if (qeTableIcx.switchFlag === 1) {
            cx_mps = d;
          }
          cx_index = qeTableIcx.nlps;
        }
      } else {
        this.chigh -= qeIcx;
        if ((a & 0x8000) !== 0) {
          this.a = a;
          return cx_mps;
        }
        if (a < qeIcx) {
          d = 1 ^ cx_mps;
          if (qeTableIcx.switchFlag === 1) {
            cx_mps = d;
          }
          cx_index = qeTableIcx.nlps;
        } else {
          d = cx_mps;
          cx_index = qeTableIcx.nmps;
        }
      }
      do {
        if (this.ct === 0) {
          this.byteIn();
        }
        a <<= 1;
        this.chigh = this.chigh << 1 & 0xFFFF | this.clow >> 15 & 1;
        this.clow = this.clow << 1 & 0xFFFF;
        this.ct--;
      } while ((a & 0x8000) === 0);
      this.a = a;
      contexts[pos] = cx_index << 1 | cx_mps;
      return d;
    }
  };
  return ArithmeticDecoder;
}();


	
	"use strict";
   var JpxImage = function JpxImageClosure() {
  var SubbandsGainLog2 = {
    'LL': 0,
    'LH': 1,
    'HL': 1,
    'HH': 2
  };
  function JpxImage() {
    this.failOnCorruptedImage = false;
  }
  JpxImage.prototype = {
    parse: function JpxImage_parse(data) {
      var head = readUint16(data, 0);
      if (head === 0xFF4F) {
        this.parseCodestream(data, 0, data.length);
        return;
      }
      var position = 0,
          length = data.length;
      while (position < length) {
        var headerSize = 8;
        var lbox = readUint32(data, position);
        var tbox = readUint32(data, position + 4);
        position += headerSize;
        if (lbox === 1) {
          lbox = readUint32(data, position) * 4294967296 + readUint32(data, position + 4);
          position += 8;
          headerSize += 8;
        }
        if (lbox === 0) {
          lbox = length - position + headerSize;
        }
        if (lbox < headerSize) {
          error('JPX Error: Invalid box field size');
        }
        var dataLength = lbox - headerSize;
        var jumpDataLength = true;
        switch (tbox) {
          case 0x6A703268:
            jumpDataLength = false;
            break;
          case 0x636F6C72:
            var method = data[position];
            if (method === 1) {
              var colorspace = readUint32(data, position + 3);
              switch (colorspace) {
                case 16:
                case 17:
                case 18:
                  break;
                default:
                  warn('Unknown colorspace ' + colorspace);
                  break;
              }
            } else if (method === 2) {
              info('ICC profile not supported');
            }
            break;
          case 0x6A703263:
            this.parseCodestream(data, position, position + dataLength);
            break;
          case 0x6A502020:
            if (readUint32(data, position) !== 0x0d0a870a) {
              warn('Invalid JP2 signature');
            }
            break;
          case 0x6A501A1A:
          case 0x66747970:
          case 0x72726571:
          case 0x72657320:
          case 0x69686472:
            break;
          default:
            var headerType = String.fromCharCode(tbox >> 24 & 0xFF, tbox >> 16 & 0xFF, tbox >> 8 & 0xFF, tbox & 0xFF);
            warn('Unsupported header type ' + tbox + ' (' + headerType + ')');
            break;
        }
        if (jumpDataLength) {
          position += dataLength;
        }
      }
    },
    parseImageProperties: function JpxImage_parseImageProperties(stream) {
      var newByte = stream.getByte();
      while (newByte >= 0) {
        var oldByte = newByte;
        newByte = stream.getByte();
        var code = oldByte << 8 | newByte;
        if (code === 0xFF51) {
          stream.skip(4);
          var Xsiz = stream.getInt32() >>> 0;
          var Ysiz = stream.getInt32() >>> 0;
          var XOsiz = stream.getInt32() >>> 0;
          var YOsiz = stream.getInt32() >>> 0;
          stream.skip(16);
          var Csiz = stream.getUint16();
          this.width = Xsiz - XOsiz;
          this.height = Ysiz - YOsiz;
          this.componentsCount = Csiz;
          this.bitsPerComponent = 8;
          return;
        }
      }
      error('JPX Error: No size marker found in JPX stream');
    },
    parseCodestream: function JpxImage_parseCodestream(data, start, end) {
      var context = {};
      var doNotRecover = false;
      try {
        var position = start;
        while (position + 1 < end) {
          var code = readUint16(data, position);
          position += 2;
          var length = 0,
              j,
              sqcd,
              spqcds,
              spqcdSize,
              scalarExpounded,
              tile;
          switch (code) {
            case 0xFF4F:
              context.mainHeader = true;
              break;
            case 0xFFD9:
              break;
            case 0xFF51:
              length = readUint16(data, position);
              var siz = {};
              siz.Xsiz = readUint32(data, position + 4);
              siz.Ysiz = readUint32(data, position + 8);
              siz.XOsiz = readUint32(data, position + 12);
              siz.YOsiz = readUint32(data, position + 16);
              siz.XTsiz = readUint32(data, position + 20);
              siz.YTsiz = readUint32(data, position + 24);
              siz.XTOsiz = readUint32(data, position + 28);
              siz.YTOsiz = readUint32(data, position + 32);
              var componentsCount = readUint16(data, position + 36);
              siz.Csiz = componentsCount;
              var components = [];
              j = position + 38;
              for (var i = 0; i < componentsCount; i++) {
                var component = {
                  precision: (data[j] & 0x7F) + 1,
                  isSigned: !!(data[j] & 0x80),
                  XRsiz: data[j + 1],
                  YRsiz: data[j + 1]
                };
                calculateComponentDimensions(component, siz);
                components.push(component);
              }
              context.SIZ = siz;
              context.components = components;
              calculateTileGrids(context, components);
              context.QCC = [];
              context.COC = [];
              break;
            case 0xFF5C:
              length = readUint16(data, position);
              var qcd = {};
              j = position + 2;
              sqcd = data[j++];
              switch (sqcd & 0x1F) {
                case 0:
                  spqcdSize = 8;
                  scalarExpounded = true;
                  break;
                case 1:
                  spqcdSize = 16;
                  scalarExpounded = false;
                  break;
                case 2:
                  spqcdSize = 16;
                  scalarExpounded = true;
                  break;
                default:
                  throw new Error('Invalid SQcd value ' + sqcd);
              }
              qcd.noQuantization = spqcdSize === 8;
              qcd.scalarExpounded = scalarExpounded;
              qcd.guardBits = sqcd >> 5;
              spqcds = [];
              while (j < length + position) {
                var spqcd = {};
                if (spqcdSize === 8) {
                  spqcd.epsilon = data[j++] >> 3;
                  spqcd.mu = 0;
                } else {
                  spqcd.epsilon = data[j] >> 3;
                  spqcd.mu = (data[j] & 0x7) << 8 | data[j + 1];
                  j += 2;
                }
                spqcds.push(spqcd);
              }
              qcd.SPqcds = spqcds;
              if (context.mainHeader) {
                context.QCD = qcd;
              } else {
                context.currentTile.QCD = qcd;
                context.currentTile.QCC = [];
              }
              break;
            case 0xFF5D:
              length = readUint16(data, position);
              var qcc = {};
              j = position + 2;
              var cqcc;
              if (context.SIZ.Csiz < 257) {
                cqcc = data[j++];
              } else {
                cqcc = readUint16(data, j);
                j += 2;
              }
              sqcd = data[j++];
              switch (sqcd & 0x1F) {
                case 0:
                  spqcdSize = 8;
                  scalarExpounded = true;
                  break;
                case 1:
                  spqcdSize = 16;
                  scalarExpounded = false;
                  break;
                case 2:
                  spqcdSize = 16;
                  scalarExpounded = true;
                  break;
                default:
                  throw new Error('Invalid SQcd value ' + sqcd);
              }
              qcc.noQuantization = spqcdSize === 8;
              qcc.scalarExpounded = scalarExpounded;
              qcc.guardBits = sqcd >> 5;
              spqcds = [];
              while (j < length + position) {
                spqcd = {};
                if (spqcdSize === 8) {
                  spqcd.epsilon = data[j++] >> 3;
                  spqcd.mu = 0;
                } else {
                  spqcd.epsilon = data[j] >> 3;
                  spqcd.mu = (data[j] & 0x7) << 8 | data[j + 1];
                  j += 2;
                }
                spqcds.push(spqcd);
              }
              qcc.SPqcds = spqcds;
              if (context.mainHeader) {
                context.QCC[cqcc] = qcc;
              } else {
                context.currentTile.QCC[cqcc] = qcc;
              }
              break;
            case 0xFF52:
              length = readUint16(data, position);
              var cod = {};
              j = position + 2;
              var scod = data[j++];
              cod.entropyCoderWithCustomPrecincts = !!(scod & 1);
              cod.sopMarkerUsed = !!(scod & 2);
              cod.ephMarkerUsed = !!(scod & 4);
              cod.progressionOrder = data[j++];
              cod.layersCount = readUint16(data, j);
              j += 2;
              cod.multipleComponentTransform = data[j++];
              cod.decompositionLevelsCount = data[j++];
              cod.xcb = (data[j++] & 0xF) + 2;
              cod.ycb = (data[j++] & 0xF) + 2;
              var blockStyle = data[j++];
              cod.selectiveArithmeticCodingBypass = !!(blockStyle & 1);
              cod.resetContextProbabilities = !!(blockStyle & 2);
              cod.terminationOnEachCodingPass = !!(blockStyle & 4);
              cod.verticalyStripe = !!(blockStyle & 8);
              cod.predictableTermination = !!(blockStyle & 16);
              cod.segmentationSymbolUsed = !!(blockStyle & 32);
              cod.reversibleTransformation = data[j++];
              if (cod.entropyCoderWithCustomPrecincts) {
                var precinctsSizes = [];
                while (j < length + position) {
                  var precinctsSize = data[j++];
                  precinctsSizes.push({
                    PPx: precinctsSize & 0xF,
                    PPy: precinctsSize >> 4
                  });
                }
                cod.precinctsSizes = precinctsSizes;
              }
              var unsupported = [];
              if (cod.selectiveArithmeticCodingBypass) {
                unsupported.push('selectiveArithmeticCodingBypass');
              }
              if (cod.resetContextProbabilities) {
                unsupported.push('resetContextProbabilities');
              }
              if (cod.terminationOnEachCodingPass) {
                unsupported.push('terminationOnEachCodingPass');
              }
              if (cod.verticalyStripe) {
                unsupported.push('verticalyStripe');
              }
              if (cod.predictableTermination) {
                unsupported.push('predictableTermination');
              }
              if (unsupported.length > 0) {
                doNotRecover = true;
                throw new Error('Unsupported COD options (' + unsupported.join(', ') + ')');
              }
              if (context.mainHeader) {
                context.COD = cod;
              } else {
                context.currentTile.COD = cod;
                context.currentTile.COC = [];
              }
              break;
            case 0xFF90:
              length = readUint16(data, position);
              tile = {};
              tile.index = readUint16(data, position + 2);
              tile.length = readUint32(data, position + 4);
              tile.dataEnd = tile.length + position - 2;
              tile.partIndex = data[position + 8];
              tile.partsCount = data[position + 9];
              context.mainHeader = false;
              if (tile.partIndex === 0) {
                tile.COD = context.COD;
                tile.COC = context.COC.slice(0);
                tile.QCD = context.QCD;
                tile.QCC = context.QCC.slice(0);
              }
              context.currentTile = tile;
              break;
            case 0xFF93:
              tile = context.currentTile;
              if (tile.partIndex === 0) {
                initializeTile(context, tile.index);
                buildPackets(context);
              }
              length = tile.dataEnd - position;
              parseTilePackets(context, data, position, length);
              break;
            case 0xFF55:
            case 0xFF57:
            case 0xFF58:
            case 0xFF64:
              length = readUint16(data, position);
              break;
            case 0xFF53:
              throw new Error('Codestream code 0xFF53 (COC) is ' + 'not implemented');
            default:
              throw new Error('Unknown codestream code: ' + code.toString(16));
          }
          position += length;
        }
      } catch (e) {
        if (doNotRecover || this.failOnCorruptedImage) {
          error('JPX Error: ' + e.message);
        } else {
          warn('JPX: Trying to recover from: ' + e.message);
        }
      }
      this.tiles = transformComponents(context);
      this.width = context.SIZ.Xsiz - context.SIZ.XOsiz;
      this.height = context.SIZ.Ysiz - context.SIZ.YOsiz;
      this.componentsCount = context.SIZ.Csiz;
    }
  };
  function calculateComponentDimensions(component, siz) {
    component.x0 = Math.ceil(siz.XOsiz / component.XRsiz);
    component.x1 = Math.ceil(siz.Xsiz / component.XRsiz);
    component.y0 = Math.ceil(siz.YOsiz / component.YRsiz);
    component.y1 = Math.ceil(siz.Ysiz / component.YRsiz);
    component.width = component.x1 - component.x0;
    component.height = component.y1 - component.y0;
  }
  function calculateTileGrids(context, components) {
    var siz = context.SIZ;
    var tile,
        tiles = [];
    var numXtiles = Math.ceil((siz.Xsiz - siz.XTOsiz) / siz.XTsiz);
    var numYtiles = Math.ceil((siz.Ysiz - siz.YTOsiz) / siz.YTsiz);
    for (var q = 0; q < numYtiles; q++) {
      for (var p = 0; p < numXtiles; p++) {
        tile = {};
        tile.tx0 = Math.max(siz.XTOsiz + p * siz.XTsiz, siz.XOsiz);
        tile.ty0 = Math.max(siz.YTOsiz + q * siz.YTsiz, siz.YOsiz);
        tile.tx1 = Math.min(siz.XTOsiz + (p + 1) * siz.XTsiz, siz.Xsiz);
        tile.ty1 = Math.min(siz.YTOsiz + (q + 1) * siz.YTsiz, siz.Ysiz);
        tile.width = tile.tx1 - tile.tx0;
        tile.height = tile.ty1 - tile.ty0;
        tile.components = [];
        tiles.push(tile);
      }
    }
    context.tiles = tiles;
    var componentsCount = siz.Csiz;
    for (var i = 0, ii = componentsCount; i < ii; i++) {
      var component = components[i];
      for (var j = 0, jj = tiles.length; j < jj; j++) {
        var tileComponent = {};
        tile = tiles[j];
        tileComponent.tcx0 = Math.ceil(tile.tx0 / component.XRsiz);
        tileComponent.tcy0 = Math.ceil(tile.ty0 / component.YRsiz);
        tileComponent.tcx1 = Math.ceil(tile.tx1 / component.XRsiz);
        tileComponent.tcy1 = Math.ceil(tile.ty1 / component.YRsiz);
        tileComponent.width = tileComponent.tcx1 - tileComponent.tcx0;
        tileComponent.height = tileComponent.tcy1 - tileComponent.tcy0;
        tile.components[i] = tileComponent;
      }
    }
  }
  function getBlocksDimensions(context, component, r) {
    var codOrCoc = component.codingStyleParameters;
    var result = {};
    if (!codOrCoc.entropyCoderWithCustomPrecincts) {
      result.PPx = 15;
      result.PPy = 15;
    } else {
      result.PPx = codOrCoc.precinctsSizes[r].PPx;
      result.PPy = codOrCoc.precinctsSizes[r].PPy;
    }
    result.xcb_ = r > 0 ? Math.min(codOrCoc.xcb, result.PPx - 1) : Math.min(codOrCoc.xcb, result.PPx);
    result.ycb_ = r > 0 ? Math.min(codOrCoc.ycb, result.PPy - 1) : Math.min(codOrCoc.ycb, result.PPy);
    return result;
  }
  function buildPrecincts(context, resolution, dimensions) {
    var precinctWidth = 1 << dimensions.PPx;
    var precinctHeight = 1 << dimensions.PPy;
    var isZeroRes = resolution.resLevel === 0;
    var precinctWidthInSubband = 1 << dimensions.PPx + (isZeroRes ? 0 : -1);
    var precinctHeightInSubband = 1 << dimensions.PPy + (isZeroRes ? 0 : -1);
    var numprecinctswide = resolution.trx1 > resolution.trx0 ? Math.ceil(resolution.trx1 / precinctWidth) - Math.floor(resolution.trx0 / precinctWidth) : 0;
    var numprecinctshigh = resolution.try1 > resolution.try0 ? Math.ceil(resolution.try1 / precinctHeight) - Math.floor(resolution.try0 / precinctHeight) : 0;
    var numprecincts = numprecinctswide * numprecinctshigh;
    resolution.precinctParameters = {
      precinctWidth: precinctWidth,
      precinctHeight: precinctHeight,
      numprecinctswide: numprecinctswide,
      numprecinctshigh: numprecinctshigh,
      numprecincts: numprecincts,
      precinctWidthInSubband: precinctWidthInSubband,
      precinctHeightInSubband: precinctHeightInSubband
    };
  }
  function buildCodeblocks(context, subband, dimensions) {
    var xcb_ = dimensions.xcb_;
    var ycb_ = dimensions.ycb_;
    var codeblockWidth = 1 << xcb_;
    var codeblockHeight = 1 << ycb_;
    var cbx0 = subband.tbx0 >> xcb_;
    var cby0 = subband.tby0 >> ycb_;
    var cbx1 = subband.tbx1 + codeblockWidth - 1 >> xcb_;
    var cby1 = subband.tby1 + codeblockHeight - 1 >> ycb_;
    var precinctParameters = subband.resolution.precinctParameters;
    var codeblocks = [];
    var precincts = [];
    var i, j, codeblock, precinctNumber;
    for (j = cby0; j < cby1; j++) {
      for (i = cbx0; i < cbx1; i++) {
        codeblock = {
          cbx: i,
          cby: j,
          tbx0: codeblockWidth * i,
          tby0: codeblockHeight * j,
          tbx1: codeblockWidth * (i + 1),
          tby1: codeblockHeight * (j + 1)
        };
        codeblock.tbx0_ = Math.max(subband.tbx0, codeblock.tbx0);
        codeblock.tby0_ = Math.max(subband.tby0, codeblock.tby0);
        codeblock.tbx1_ = Math.min(subband.tbx1, codeblock.tbx1);
        codeblock.tby1_ = Math.min(subband.tby1, codeblock.tby1);
        var pi = Math.floor((codeblock.tbx0_ - subband.tbx0) / precinctParameters.precinctWidthInSubband);
        var pj = Math.floor((codeblock.tby0_ - subband.tby0) / precinctParameters.precinctHeightInSubband);
        precinctNumber = pi + pj * precinctParameters.numprecinctswide;
        codeblock.precinctNumber = precinctNumber;
        codeblock.subbandType = subband.type;
        codeblock.Lblock = 3;
        if (codeblock.tbx1_ <= codeblock.tbx0_ || codeblock.tby1_ <= codeblock.tby0_) {
          continue;
        }
        codeblocks.push(codeblock);
        var precinct = precincts[precinctNumber];
        if (precinct !== undefined) {
          if (i < precinct.cbxMin) {
            precinct.cbxMin = i;
          } else if (i > precinct.cbxMax) {
            precinct.cbxMax = i;
          }
          if (j < precinct.cbyMin) {
            precinct.cbxMin = j;
          } else if (j > precinct.cbyMax) {
            precinct.cbyMax = j;
          }
        } else {
          precincts[precinctNumber] = precinct = {
            cbxMin: i,
            cbyMin: j,
            cbxMax: i,
            cbyMax: j
          };
        }
        codeblock.precinct = precinct;
      }
    }
    subband.codeblockParameters = {
      codeblockWidth: xcb_,
      codeblockHeight: ycb_,
      numcodeblockwide: cbx1 - cbx0 + 1,
      numcodeblockhigh: cby1 - cby0 + 1
    };
    subband.codeblocks = codeblocks;
    subband.precincts = precincts;
  }
  function createPacket(resolution, precinctNumber, layerNumber) {
    var precinctCodeblocks = [];
    var subbands = resolution.subbands;
    for (var i = 0, ii = subbands.length; i < ii; i++) {
      var subband = subbands[i];
      var codeblocks = subband.codeblocks;
      for (var j = 0, jj = codeblocks.length; j < jj; j++) {
        var codeblock = codeblocks[j];
        if (codeblock.precinctNumber !== precinctNumber) {
          continue;
        }
        precinctCodeblocks.push(codeblock);
      }
    }
    return {
      layerNumber: layerNumber,
      codeblocks: precinctCodeblocks
    };
  }
  function LayerResolutionComponentPositionIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var maxDecompositionLevelsCount = 0;
    for (var q = 0; q < componentsCount; q++) {
      maxDecompositionLevelsCount = Math.max(maxDecompositionLevelsCount, tile.components[q].codingStyleParameters.decompositionLevelsCount);
    }
    var l = 0,
        r = 0,
        i = 0,
        k = 0;
    this.nextPacket = function JpxImage_nextPacket() {
      for (; l < layersCount; l++) {
        for (; r <= maxDecompositionLevelsCount; r++) {
          for (; i < componentsCount; i++) {
            var component = tile.components[i];
            if (r > component.codingStyleParameters.decompositionLevelsCount) {
              continue;
            }
            var resolution = component.resolutions[r];
            var numprecincts = resolution.precinctParameters.numprecincts;
            for (; k < numprecincts;) {
              var packet = createPacket(resolution, k, l);
              k++;
              return packet;
            }
            k = 0;
          }
          i = 0;
        }
        r = 0;
      }
      error('JPX Error: Out of packets');
    };
  }
  function ResolutionLayerComponentPositionIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var maxDecompositionLevelsCount = 0;
    for (var q = 0; q < componentsCount; q++) {
      maxDecompositionLevelsCount = Math.max(maxDecompositionLevelsCount, tile.components[q].codingStyleParameters.decompositionLevelsCount);
    }
    var r = 0,
        l = 0,
        i = 0,
        k = 0;
    this.nextPacket = function JpxImage_nextPacket() {
      for (; r <= maxDecompositionLevelsCount; r++) {
        for (; l < layersCount; l++) {
          for (; i < componentsCount; i++) {
            var component = tile.components[i];
            if (r > component.codingStyleParameters.decompositionLevelsCount) {
              continue;
            }
            var resolution = component.resolutions[r];
            var numprecincts = resolution.precinctParameters.numprecincts;
            for (; k < numprecincts;) {
              var packet = createPacket(resolution, k, l);
              k++;
              return packet;
            }
            k = 0;
          }
          i = 0;
        }
        l = 0;
      }
      error('JPX Error: Out of packets');
    };
  }
  function ResolutionPositionComponentLayerIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var l, r, c, p;
    var maxDecompositionLevelsCount = 0;
    for (c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      maxDecompositionLevelsCount = Math.max(maxDecompositionLevelsCount, component.codingStyleParameters.decompositionLevelsCount);
    }
    var maxNumPrecinctsInLevel = new Int32Array(maxDecompositionLevelsCount + 1);
    for (r = 0; r <= maxDecompositionLevelsCount; ++r) {
      var maxNumPrecincts = 0;
      for (c = 0; c < componentsCount; ++c) {
        var resolutions = tile.components[c].resolutions;
        if (r < resolutions.length) {
          maxNumPrecincts = Math.max(maxNumPrecincts, resolutions[r].precinctParameters.numprecincts);
        }
      }
      maxNumPrecinctsInLevel[r] = maxNumPrecincts;
    }
    l = 0;
    r = 0;
    c = 0;
    p = 0;
    this.nextPacket = function JpxImage_nextPacket() {
      for (; r <= maxDecompositionLevelsCount; r++) {
        for (; p < maxNumPrecinctsInLevel[r]; p++) {
          for (; c < componentsCount; c++) {
            var component = tile.components[c];
            if (r > component.codingStyleParameters.decompositionLevelsCount) {
              continue;
            }
            var resolution = component.resolutions[r];
            var numprecincts = resolution.precinctParameters.numprecincts;
            if (p >= numprecincts) {
              continue;
            }
            for (; l < layersCount;) {
              var packet = createPacket(resolution, p, l);
              l++;
              return packet;
            }
            l = 0;
          }
          c = 0;
        }
        p = 0;
      }
      error('JPX Error: Out of packets');
    };
  }
  function PositionComponentResolutionLayerIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var precinctsSizes = getPrecinctSizesInImageScale(tile);
    var precinctsIterationSizes = precinctsSizes;
    var l = 0,
        r = 0,
        c = 0,
        px = 0,
        py = 0;
    this.nextPacket = function JpxImage_nextPacket() {
      for (; py < precinctsIterationSizes.maxNumHigh; py++) {
        for (; px < precinctsIterationSizes.maxNumWide; px++) {
          for (; c < componentsCount; c++) {
            var component = tile.components[c];
            var decompositionLevelsCount = component.codingStyleParameters.decompositionLevelsCount;
            for (; r <= decompositionLevelsCount; r++) {
              var resolution = component.resolutions[r];
              var sizeInImageScale = precinctsSizes.components[c].resolutions[r];
              var k = getPrecinctIndexIfExist(px, py, sizeInImageScale, precinctsIterationSizes, resolution);
              if (k === null) {
                continue;
              }
              for (; l < layersCount;) {
                var packet = createPacket(resolution, k, l);
                l++;
                return packet;
              }
              l = 0;
            }
            r = 0;
          }
          c = 0;
        }
        px = 0;
      }
      error('JPX Error: Out of packets');
    };
  }
  function ComponentPositionResolutionLayerIterator(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var layersCount = tile.codingStyleDefaultParameters.layersCount;
    var componentsCount = siz.Csiz;
    var precinctsSizes = getPrecinctSizesInImageScale(tile);
    var l = 0,
        r = 0,
        c = 0,
        px = 0,
        py = 0;
    this.nextPacket = function JpxImage_nextPacket() {
      for (; c < componentsCount; ++c) {
        var component = tile.components[c];
        var precinctsIterationSizes = precinctsSizes.components[c];
        var decompositionLevelsCount = component.codingStyleParameters.decompositionLevelsCount;
        for (; py < precinctsIterationSizes.maxNumHigh; py++) {
          for (; px < precinctsIterationSizes.maxNumWide; px++) {
            for (; r <= decompositionLevelsCount; r++) {
              var resolution = component.resolutions[r];
              var sizeInImageScale = precinctsIterationSizes.resolutions[r];
              var k = getPrecinctIndexIfExist(px, py, sizeInImageScale, precinctsIterationSizes, resolution);
              if (k === null) {
                continue;
              }
              for (; l < layersCount;) {
                var packet = createPacket(resolution, k, l);
                l++;
                return packet;
              }
              l = 0;
            }
            r = 0;
          }
          px = 0;
        }
        py = 0;
      }
      error('JPX Error: Out of packets');
    };
  }
  function getPrecinctIndexIfExist(pxIndex, pyIndex, sizeInImageScale, precinctIterationSizes, resolution) {
    var posX = pxIndex * precinctIterationSizes.minWidth;
    var posY = pyIndex * precinctIterationSizes.minHeight;
    if (posX % sizeInImageScale.width !== 0 || posY % sizeInImageScale.height !== 0) {
      return null;
    }
    var startPrecinctRowIndex = posY / sizeInImageScale.width * resolution.precinctParameters.numprecinctswide;
    return posX / sizeInImageScale.height + startPrecinctRowIndex;
  }
  function getPrecinctSizesInImageScale(tile) {
    var componentsCount = tile.components.length;
    var minWidth = Number.MAX_VALUE;
    var minHeight = Number.MAX_VALUE;
    var maxNumWide = 0;
    var maxNumHigh = 0;
    var sizePerComponent = new Array(componentsCount);
    for (var c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      var decompositionLevelsCount = component.codingStyleParameters.decompositionLevelsCount;
      var sizePerResolution = new Array(decompositionLevelsCount + 1);
      var minWidthCurrentComponent = Number.MAX_VALUE;
      var minHeightCurrentComponent = Number.MAX_VALUE;
      var maxNumWideCurrentComponent = 0;
      var maxNumHighCurrentComponent = 0;
      var scale = 1;
      for (var r = decompositionLevelsCount; r >= 0; --r) {
        var resolution = component.resolutions[r];
        var widthCurrentResolution = scale * resolution.precinctParameters.precinctWidth;
        var heightCurrentResolution = scale * resolution.precinctParameters.precinctHeight;
        minWidthCurrentComponent = Math.min(minWidthCurrentComponent, widthCurrentResolution);
        minHeightCurrentComponent = Math.min(minHeightCurrentComponent, heightCurrentResolution);
        maxNumWideCurrentComponent = Math.max(maxNumWideCurrentComponent, resolution.precinctParameters.numprecinctswide);
        maxNumHighCurrentComponent = Math.max(maxNumHighCurrentComponent, resolution.precinctParameters.numprecinctshigh);
        sizePerResolution[r] = {
          width: widthCurrentResolution,
          height: heightCurrentResolution
        };
        scale <<= 1;
      }
      minWidth = Math.min(minWidth, minWidthCurrentComponent);
      minHeight = Math.min(minHeight, minHeightCurrentComponent);
      maxNumWide = Math.max(maxNumWide, maxNumWideCurrentComponent);
      maxNumHigh = Math.max(maxNumHigh, maxNumHighCurrentComponent);
      sizePerComponent[c] = {
        resolutions: sizePerResolution,
        minWidth: minWidthCurrentComponent,
        minHeight: minHeightCurrentComponent,
        maxNumWide: maxNumWideCurrentComponent,
        maxNumHigh: maxNumHighCurrentComponent
      };
    }
    return {
      components: sizePerComponent,
      minWidth: minWidth,
      minHeight: minHeight,
      maxNumWide: maxNumWide,
      maxNumHigh: maxNumHigh
    };
  }
  function buildPackets(context) {
    var siz = context.SIZ;
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var componentsCount = siz.Csiz;
    for (var c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      var decompositionLevelsCount = component.codingStyleParameters.decompositionLevelsCount;
      var resolutions = [];
      var subbands = [];
      for (var r = 0; r <= decompositionLevelsCount; r++) {
        var blocksDimensions = getBlocksDimensions(context, component, r);
        var resolution = {};
        var scale = 1 << decompositionLevelsCount - r;
        resolution.trx0 = Math.ceil(component.tcx0 / scale);
        resolution.try0 = Math.ceil(component.tcy0 / scale);
        resolution.trx1 = Math.ceil(component.tcx1 / scale);
        resolution.try1 = Math.ceil(component.tcy1 / scale);
        resolution.resLevel = r;
        buildPrecincts(context, resolution, blocksDimensions);
        resolutions.push(resolution);
        var subband;
        if (r === 0) {
          subband = {};
          subband.type = 'LL';
          subband.tbx0 = Math.ceil(component.tcx0 / scale);
          subband.tby0 = Math.ceil(component.tcy0 / scale);
          subband.tbx1 = Math.ceil(component.tcx1 / scale);
          subband.tby1 = Math.ceil(component.tcy1 / scale);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolution.subbands = [subband];
        } else {
          var bscale = 1 << decompositionLevelsCount - r + 1;
          var resolutionSubbands = [];
          subband = {};
          subband.type = 'HL';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale - 0.5);
          subband.tby0 = Math.ceil(component.tcy0 / bscale);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale - 0.5);
          subband.tby1 = Math.ceil(component.tcy1 / bscale);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);
          subband = {};
          subband.type = 'LH';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale);
          subband.tby0 = Math.ceil(component.tcy0 / bscale - 0.5);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale);
          subband.tby1 = Math.ceil(component.tcy1 / bscale - 0.5);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);
          subband = {};
          subband.type = 'HH';
          subband.tbx0 = Math.ceil(component.tcx0 / bscale - 0.5);
          subband.tby0 = Math.ceil(component.tcy0 / bscale - 0.5);
          subband.tbx1 = Math.ceil(component.tcx1 / bscale - 0.5);
          subband.tby1 = Math.ceil(component.tcy1 / bscale - 0.5);
          subband.resolution = resolution;
          buildCodeblocks(context, subband, blocksDimensions);
          subbands.push(subband);
          resolutionSubbands.push(subband);
          resolution.subbands = resolutionSubbands;
        }
      }
      component.resolutions = resolutions;
      component.subbands = subbands;
    }
    var progressionOrder = tile.codingStyleDefaultParameters.progressionOrder;
    switch (progressionOrder) {
      case 0:
        tile.packetsIterator = new LayerResolutionComponentPositionIterator(context);
        break;
      case 1:
        tile.packetsIterator = new ResolutionLayerComponentPositionIterator(context);
        break;
      case 2:
        tile.packetsIterator = new ResolutionPositionComponentLayerIterator(context);
        break;
      case 3:
        tile.packetsIterator = new PositionComponentResolutionLayerIterator(context);
        break;
      case 4:
        tile.packetsIterator = new ComponentPositionResolutionLayerIterator(context);
        break;
      default:
        error('JPX Error: Unsupported progression order ' + progressionOrder);
    }
  }
  function parseTilePackets(context, data, offset, dataLength) {
    var position = 0;
    var buffer,
        bufferSize = 0,
        skipNextBit = false;
    function readBits(count) {
      while (bufferSize < count) {
        var b = data[offset + position];
        position++;
        if (skipNextBit) {
          buffer = buffer << 7 | b;
          bufferSize += 7;
          skipNextBit = false;
        } else {
          buffer = buffer << 8 | b;
          bufferSize += 8;
        }
        if (b === 0xFF) {
          skipNextBit = true;
        }
      }
      bufferSize -= count;
      return buffer >>> bufferSize & (1 << count) - 1;
    }
    function skipMarkerIfEqual(value) {
      if (data[offset + position - 1] === 0xFF && data[offset + position] === value) {
        skipBytes(1);
        return true;
      } else if (data[offset + position] === 0xFF && data[offset + position + 1] === value) {
        skipBytes(2);
        return true;
      }
      return false;
    }
    function skipBytes(count) {
      position += count;
    }
    function alignToByte() {
      bufferSize = 0;
      if (skipNextBit) {
        position++;
        skipNextBit = false;
      }
    }
    function readCodingpasses() {
      if (readBits(1) === 0) {
        return 1;
      }
      if (readBits(1) === 0) {
        return 2;
      }
      var value = readBits(2);
      if (value < 3) {
        return value + 3;
      }
      value = readBits(5);
      if (value < 31) {
        return value + 6;
      }
      value = readBits(7);
      return value + 37;
    }
    var tileIndex = context.currentTile.index;
    var tile = context.tiles[tileIndex];
    var sopMarkerUsed = context.COD.sopMarkerUsed;
    var ephMarkerUsed = context.COD.ephMarkerUsed;
    var packetsIterator = tile.packetsIterator;
    while (position < dataLength) {
      alignToByte();
      if (sopMarkerUsed && skipMarkerIfEqual(0x91)) {
        skipBytes(4);
      }
      var packet = packetsIterator.nextPacket();
      if (!readBits(1)) {
        continue;
      }
      var layerNumber = packet.layerNumber;
      var queue = [],
          codeblock;
      for (var i = 0, ii = packet.codeblocks.length; i < ii; i++) {
        codeblock = packet.codeblocks[i];
        var precinct = codeblock.precinct;
        var codeblockColumn = codeblock.cbx - precinct.cbxMin;
        var codeblockRow = codeblock.cby - precinct.cbyMin;
        var codeblockIncluded = false;
        var firstTimeInclusion = false;
        var valueReady;
        if (codeblock['included'] !== undefined) {
          codeblockIncluded = !!readBits(1);
        } else {
          precinct = codeblock.precinct;
          var inclusionTree, zeroBitPlanesTree;
          if (precinct['inclusionTree'] !== undefined) {
            inclusionTree = precinct.inclusionTree;
          } else {
            var width = precinct.cbxMax - precinct.cbxMin + 1;
            var height = precinct.cbyMax - precinct.cbyMin + 1;
            inclusionTree = new InclusionTree(width, height, layerNumber);
            zeroBitPlanesTree = new TagTree(width, height);
            precinct.inclusionTree = inclusionTree;
            precinct.zeroBitPlanesTree = zeroBitPlanesTree;
          }
          if (inclusionTree.reset(codeblockColumn, codeblockRow, layerNumber)) {
            while (true) {
              if (readBits(1)) {
                valueReady = !inclusionTree.nextLevel();
                if (valueReady) {
                  codeblock.included = true;
                  codeblockIncluded = firstTimeInclusion = true;
                  break;
                }
              } else {
                inclusionTree.incrementValue(layerNumber);
                break;
              }
            }
          }
        }
        if (!codeblockIncluded) {
          continue;
        }
        if (firstTimeInclusion) {
          zeroBitPlanesTree = precinct.zeroBitPlanesTree;
          zeroBitPlanesTree.reset(codeblockColumn, codeblockRow);
          while (true) {
            if (readBits(1)) {
              valueReady = !zeroBitPlanesTree.nextLevel();
              if (valueReady) {
                break;
              }
            } else {
              zeroBitPlanesTree.incrementValue();
            }
          }
          codeblock.zeroBitPlanes = zeroBitPlanesTree.value;
        }
        var codingpasses = readCodingpasses();
        while (readBits(1)) {
          codeblock.Lblock++;
        }
        var codingpassesLog2 = log2(codingpasses);
        var bits = (codingpasses < 1 << codingpassesLog2 ? codingpassesLog2 - 1 : codingpassesLog2) + codeblock.Lblock;
        var codedDataLength = readBits(bits);
        queue.push({
          codeblock: codeblock,
          codingpasses: codingpasses,
          dataLength: codedDataLength
        });
      }
      alignToByte();
      if (ephMarkerUsed) {
        skipMarkerIfEqual(0x92);
      }
      while (queue.length > 0) {
        var packetItem = queue.shift();
        codeblock = packetItem.codeblock;
        if (codeblock['data'] === undefined) {
          codeblock.data = [];
        }
        codeblock.data.push({
          data: data,
          start: offset + position,
          end: offset + position + packetItem.dataLength,
          codingpasses: packetItem.codingpasses
        });
        position += packetItem.dataLength;
      }
    }
    return position;
  }
  function copyCoefficients(coefficients, levelWidth, levelHeight, subband, delta, mb, reversible, segmentationSymbolUsed) {
    var x0 = subband.tbx0;
    var y0 = subband.tby0;
    var width = subband.tbx1 - subband.tbx0;
    var codeblocks = subband.codeblocks;
    var right = subband.type.charAt(0) === 'H' ? 1 : 0;
    var bottom = subband.type.charAt(1) === 'H' ? levelWidth : 0;
    for (var i = 0, ii = codeblocks.length; i < ii; ++i) {
      var codeblock = codeblocks[i];
      var blockWidth = codeblock.tbx1_ - codeblock.tbx0_;
      var blockHeight = codeblock.tby1_ - codeblock.tby0_;
      if (blockWidth === 0 || blockHeight === 0) {
        continue;
      }
      if (codeblock['data'] === undefined) {
        continue;
      }
      var bitModel, currentCodingpassType;
      bitModel = new BitModel(blockWidth, blockHeight, codeblock.subbandType, codeblock.zeroBitPlanes, mb);
      currentCodingpassType = 2;
      var data = codeblock.data,
          totalLength = 0,
          codingpasses = 0;
      var j, jj, dataItem;
      for (j = 0, jj = data.length; j < jj; j++) {
        dataItem = data[j];
        totalLength += dataItem.end - dataItem.start;
        codingpasses += dataItem.codingpasses;
      }
      var encodedData = new Uint8Array(totalLength);
      var position = 0;
      for (j = 0, jj = data.length; j < jj; j++) {
        dataItem = data[j];
        var chunk = dataItem.data.subarray(dataItem.start, dataItem.end);
        encodedData.set(chunk, position);
        position += chunk.length;
      }
      var decoder = new ArithmeticDecoder(encodedData, 0, totalLength);
      bitModel.setDecoder(decoder);
      for (j = 0; j < codingpasses; j++) {
        switch (currentCodingpassType) {
          case 0:
            bitModel.runSignificancePropagationPass();
            break;
          case 1:
            bitModel.runMagnitudeRefinementPass();
            break;
          case 2:
            bitModel.runCleanupPass();
            if (segmentationSymbolUsed) {
              bitModel.checkSegmentationSymbol();
            }
            break;
        }
        currentCodingpassType = (currentCodingpassType + 1) % 3;
      }
      var offset = codeblock.tbx0_ - x0 + (codeblock.tby0_ - y0) * width;
      var sign = bitModel.coefficentsSign;
      var magnitude = bitModel.coefficentsMagnitude;
      var bitsDecoded = bitModel.bitsDecoded;
      var magnitudeCorrection = reversible ? 0 : 0.5;
      var k, n, nb;
      position = 0;
      var interleave = subband.type !== 'LL';
      for (j = 0; j < blockHeight; j++) {
        var row = offset / width | 0;
        var levelOffset = 2 * row * (levelWidth - width) + right + bottom;
        for (k = 0; k < blockWidth; k++) {
          n = magnitude[position];
          if (n !== 0) {
            n = (n + magnitudeCorrection) * delta;
            if (sign[position] !== 0) {
              n = -n;
            }
            nb = bitsDecoded[position];
            var pos = interleave ? levelOffset + (offset << 1) : offset;
            if (reversible && nb >= mb) {
              coefficients[pos] = n;
            } else {
              coefficients[pos] = n * (1 << mb - nb);
            }
          }
          offset++;
          position++;
        }
        offset += width - blockWidth;
      }
    }
  }
  function transformTile(context, tile, c) {
    var component = tile.components[c];
    var codingStyleParameters = component.codingStyleParameters;
    var quantizationParameters = component.quantizationParameters;
    var decompositionLevelsCount = codingStyleParameters.decompositionLevelsCount;
    var spqcds = quantizationParameters.SPqcds;
    var scalarExpounded = quantizationParameters.scalarExpounded;
    var guardBits = quantizationParameters.guardBits;
    var segmentationSymbolUsed = codingStyleParameters.segmentationSymbolUsed;
    var precision = context.components[c].precision;
    var reversible = codingStyleParameters.reversibleTransformation;
    var transform = reversible ? new ReversibleTransform() : new IrreversibleTransform();
    var subbandCoefficients = [];
    var b = 0;
    for (var i = 0; i <= decompositionLevelsCount; i++) {
      var resolution = component.resolutions[i];
      var width = resolution.trx1 - resolution.trx0;
      var height = resolution.try1 - resolution.try0;
      var coefficients = new Float32Array(width * height);
      for (var j = 0, jj = resolution.subbands.length; j < jj; j++) {
        var mu, epsilon;
        if (!scalarExpounded) {
          mu = spqcds[0].mu;
          epsilon = spqcds[0].epsilon + (i > 0 ? 1 - i : 0);
        } else {
          mu = spqcds[b].mu;
          epsilon = spqcds[b].epsilon;
          b++;
        }
        var subband = resolution.subbands[j];
        var gainLog2 = SubbandsGainLog2[subband.type];
        var delta = reversible ? 1 : Math.pow(2, precision + gainLog2 - epsilon) * (1 + mu / 2048);
        var mb = guardBits + epsilon - 1;
        copyCoefficients(coefficients, width, height, subband, delta, mb, reversible, segmentationSymbolUsed);
      }
      subbandCoefficients.push({
        width: width,
        height: height,
        items: coefficients
      });
    }
    var result = transform.calculate(subbandCoefficients, component.tcx0, component.tcy0);
    return {
      left: component.tcx0,
      top: component.tcy0,
      width: result.width,
      height: result.height,
      items: result.items
    };
  }
  function transformComponents(context) {
    var siz = context.SIZ;
    var components = context.components;
    var componentsCount = siz.Csiz;
    var resultImages = [];
    for (var i = 0, ii = context.tiles.length; i < ii; i++) {
      var tile = context.tiles[i];
      var transformedTiles = [];
      var c;
      for (c = 0; c < componentsCount; c++) {
        transformedTiles[c] = transformTile(context, tile, c);
      }
      var tile0 = transformedTiles[0];
      var out = new Uint8Array(tile0.items.length * componentsCount);
      var result = {
        left: tile0.left,
        top: tile0.top,
        width: tile0.width,
        height: tile0.height,
        items: out
      };
      var shift, offset, max, min, maxK;
      var pos = 0,
          j,
          jj,
          y0,
          y1,
          y2,
          r,
          g,
          b,
          k,
          val;
      if (tile.codingStyleDefaultParameters.multipleComponentTransform) {
        var fourComponents = componentsCount === 4;
        var y0items = transformedTiles[0].items;
        var y1items = transformedTiles[1].items;
        var y2items = transformedTiles[2].items;
        var y3items = fourComponents ? transformedTiles[3].items : null;
        shift = components[0].precision - 8;
        offset = (128 << shift) + 0.5;
        max = 255 * (1 << shift);
        maxK = max * 0.5;
        min = -maxK;
        var component0 = tile.components[0];
        var alpha01 = componentsCount - 3;
        jj = y0items.length;
        if (!component0.codingStyleParameters.reversibleTransformation) {
          for (j = 0; j < jj; j++, pos += alpha01) {
            y0 = y0items[j] + offset;
            y1 = y1items[j];
            y2 = y2items[j];
            r = y0 + 1.402 * y2;
            g = y0 - 0.34413 * y1 - 0.71414 * y2;
            b = y0 + 1.772 * y1;
            out[pos++] = r <= 0 ? 0 : r >= max ? 255 : r >> shift;
            out[pos++] = g <= 0 ? 0 : g >= max ? 255 : g >> shift;
            out[pos++] = b <= 0 ? 0 : b >= max ? 255 : b >> shift;
          }
        } else {
          for (j = 0; j < jj; j++, pos += alpha01) {
            y0 = y0items[j] + offset;
            y1 = y1items[j];
            y2 = y2items[j];
            g = y0 - (y2 + y1 >> 2);
            r = g + y2;
            b = g + y1;
            out[pos++] = r <= 0 ? 0 : r >= max ? 255 : r >> shift;
            out[pos++] = g <= 0 ? 0 : g >= max ? 255 : g >> shift;
            out[pos++] = b <= 0 ? 0 : b >= max ? 255 : b >> shift;
          }
        }
        if (fourComponents) {
          for (j = 0, pos = 3; j < jj; j++, pos += 4) {
            k = y3items[j];
            out[pos] = k <= min ? 0 : k >= maxK ? 255 : k + offset >> shift;
          }
        }
      } else {
        for (c = 0; c < componentsCount; c++) {
          var items = transformedTiles[c].items;
          shift = components[c].precision - 8;
          offset = (128 << shift) + 0.5;
          max = 127.5 * (1 << shift);
          min = -max;
          for (pos = c, j = 0, jj = items.length; j < jj; j++) {
            val = items[j];
            out[pos] = val <= min ? 0 : val >= max ? 255 : val + offset >> shift;
            pos += componentsCount;
          }
        }
      }
      resultImages.push(result);
    }
    return resultImages;
  }
  function initializeTile(context, tileIndex) {
    var siz = context.SIZ;
    var componentsCount = siz.Csiz;
    var tile = context.tiles[tileIndex];
    for (var c = 0; c < componentsCount; c++) {
      var component = tile.components[c];
      var qcdOrQcc = context.currentTile.QCC[c] !== undefined ? context.currentTile.QCC[c] : context.currentTile.QCD;
      component.quantizationParameters = qcdOrQcc;
      var codOrCoc = context.currentTile.COC[c] !== undefined ? context.currentTile.COC[c] : context.currentTile.COD;
      component.codingStyleParameters = codOrCoc;
    }
    tile.codingStyleDefaultParameters = context.currentTile.COD;
  }
  var TagTree = function TagTreeClosure() {
    function TagTree(width, height) {
      var levelsLength = log2(Math.max(width, height)) + 1;
      this.levels = [];
      for (var i = 0; i < levelsLength; i++) {
        var level = {
          width: width,
          height: height,
          items: []
        };
        this.levels.push(level);
        width = Math.ceil(width / 2);
        height = Math.ceil(height / 2);
      }
    }
    TagTree.prototype = {
      reset: function TagTree_reset(i, j) {
        var currentLevel = 0,
            value = 0,
            level;
        while (currentLevel < this.levels.length) {
          level = this.levels[currentLevel];
          var index = i + j * level.width;
          if (level.items[index] !== undefined) {
            value = level.items[index];
            break;
          }
          level.index = index;
          i >>= 1;
          j >>= 1;
          currentLevel++;
        }
        currentLevel--;
        level = this.levels[currentLevel];
        level.items[level.index] = value;
        this.currentLevel = currentLevel;
        delete this.value;
      },
      incrementValue: function TagTree_incrementValue() {
        var level = this.levels[this.currentLevel];
        level.items[level.index]++;
      },
      nextLevel: function TagTree_nextLevel() {
        var currentLevel = this.currentLevel;
        var level = this.levels[currentLevel];
        var value = level.items[level.index];
        currentLevel--;
        if (currentLevel < 0) {
          this.value = value;
          return false;
        }
        this.currentLevel = currentLevel;
        level = this.levels[currentLevel];
        level.items[level.index] = value;
        return true;
      }
    };
    return TagTree;
  }();
  var InclusionTree = function InclusionTreeClosure() {
    function InclusionTree(width, height, defaultValue) {
      var levelsLength = log2(Math.max(width, height)) + 1;
      this.levels = [];
      for (var i = 0; i < levelsLength; i++) {
        var items = new Uint8Array(width * height);
        for (var j = 0, jj = items.length; j < jj; j++) {
          items[j] = defaultValue;
        }
        var level = {
          width: width,
          height: height,
          items: items
        };
        this.levels.push(level);
        width = Math.ceil(width / 2);
        height = Math.ceil(height / 2);
      }
    }
    InclusionTree.prototype = {
      reset: function InclusionTree_reset(i, j, stopValue) {
        var currentLevel = 0;
        while (currentLevel < this.levels.length) {
          var level = this.levels[currentLevel];
          var index = i + j * level.width;
          level.index = index;
          var value = level.items[index];
          if (value === 0xFF) {
            break;
          }
          if (value > stopValue) {
            this.currentLevel = currentLevel;
            this.propagateValues();
            return false;
          }
          i >>= 1;
          j >>= 1;
          currentLevel++;
        }
        this.currentLevel = currentLevel - 1;
        return true;
      },
      incrementValue: function InclusionTree_incrementValue(stopValue) {
        var level = this.levels[this.currentLevel];
        level.items[level.index] = stopValue + 1;
        this.propagateValues();
      },
      propagateValues: function InclusionTree_propagateValues() {
        var levelIndex = this.currentLevel;
        var level = this.levels[levelIndex];
        var currentValue = level.items[level.index];
        while (--levelIndex >= 0) {
          level = this.levels[levelIndex];
          level.items[level.index] = currentValue;
        }
      },
      nextLevel: function InclusionTree_nextLevel() {
        var currentLevel = this.currentLevel;
        var level = this.levels[currentLevel];
        var value = level.items[level.index];
        level.items[level.index] = 0xFF;
        currentLevel--;
        if (currentLevel < 0) {
          return false;
        }
        this.currentLevel = currentLevel;
        level = this.levels[currentLevel];
        level.items[level.index] = value;
        return true;
      }
    };
    return InclusionTree;
  }();
  var BitModel = function BitModelClosure() {
    var UNIFORM_CONTEXT = 17;
    var RUNLENGTH_CONTEXT = 18;
    var LLAndLHContextsLabel = new Uint8Array([0, 5, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 1, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 2, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 2, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8, 0, 0, 0, 0, 0, 2, 6, 8, 0, 3, 7, 8, 0, 4, 7, 8]);
    var HLContextLabel = new Uint8Array([0, 3, 4, 0, 5, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 1, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 2, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 2, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8, 0, 0, 0, 0, 0, 2, 3, 4, 0, 6, 7, 7, 0, 8, 8, 8]);
    var HHContextLabel = new Uint8Array([0, 1, 2, 0, 1, 2, 2, 0, 2, 2, 2, 0, 0, 0, 0, 0, 3, 4, 5, 0, 4, 5, 5, 0, 5, 5, 5, 0, 0, 0, 0, 0, 6, 7, 7, 0, 7, 7, 7, 0, 7, 7, 7, 0, 0, 0, 0, 0, 8, 8, 8, 0, 8, 8, 8, 0, 8, 8, 8, 0, 0, 0, 0, 0, 8, 8, 8, 0, 8, 8, 8, 0, 8, 8, 8]);
    function BitModel(width, height, subband, zeroBitPlanes, mb) {
      this.width = width;
      this.height = height;
      this.contextLabelTable = subband === 'HH' ? HHContextLabel : subband === 'HL' ? HLContextLabel : LLAndLHContextsLabel;
      var coefficientCount = width * height;
      this.neighborsSignificance = new Uint8Array(coefficientCount);
      this.coefficentsSign = new Uint8Array(coefficientCount);
      this.coefficentsMagnitude = mb > 14 ? new Uint32Array(coefficientCount) : mb > 6 ? new Uint16Array(coefficientCount) : new Uint8Array(coefficientCount);
      this.processingFlags = new Uint8Array(coefficientCount);
      var bitsDecoded = new Uint8Array(coefficientCount);
      if (zeroBitPlanes !== 0) {
        for (var i = 0; i < coefficientCount; i++) {
          bitsDecoded[i] = zeroBitPlanes;
        }
      }
      this.bitsDecoded = bitsDecoded;
      this.reset();
    }
    BitModel.prototype = {
      setDecoder: function BitModel_setDecoder(decoder) {
        this.decoder = decoder;
      },
      reset: function BitModel_reset() {
        this.contexts = new Int8Array(19);
        this.contexts[0] = 4 << 1 | 0;
        this.contexts[UNIFORM_CONTEXT] = 46 << 1 | 0;
        this.contexts[RUNLENGTH_CONTEXT] = 3 << 1 | 0;
      },
      setNeighborsSignificance: function BitModel_setNeighborsSignificance(row, column, index) {
        var neighborsSignificance = this.neighborsSignificance;
        var width = this.width,
            height = this.height;
        var left = column > 0;
        var right = column + 1 < width;
        var i;
        if (row > 0) {
          i = index - width;
          if (left) {
            neighborsSignificance[i - 1] += 0x10;
          }
          if (right) {
            neighborsSignificance[i + 1] += 0x10;
          }
          neighborsSignificance[i] += 0x04;
        }
        if (row + 1 < height) {
          i = index + width;
          if (left) {
            neighborsSignificance[i - 1] += 0x10;
          }
          if (right) {
            neighborsSignificance[i + 1] += 0x10;
          }
          neighborsSignificance[i] += 0x04;
        }
        if (left) {
          neighborsSignificance[index - 1] += 0x01;
        }
        if (right) {
          neighborsSignificance[index + 1] += 0x01;
        }
        neighborsSignificance[index] |= 0x80;
      },
      runSignificancePropagationPass: function BitModel_runSignificancePropagationPass() {
        var decoder = this.decoder;
        var width = this.width,
            height = this.height;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var neighborsSignificance = this.neighborsSignificance;
        var processingFlags = this.processingFlags;
        var contexts = this.contexts;
        var labels = this.contextLabelTable;
        var bitsDecoded = this.bitsDecoded;
        var processedInverseMask = ~1;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        for (var i0 = 0; i0 < height; i0 += 4) {
          for (var j = 0; j < width; j++) {
            var index = i0 * width + j;
            for (var i1 = 0; i1 < 4; i1++, index += width) {
              var i = i0 + i1;
              if (i >= height) {
                break;
              }
              processingFlags[index] &= processedInverseMask;
              if (coefficentsMagnitude[index] || !neighborsSignificance[index]) {
                continue;
              }
              var contextLabel = labels[neighborsSignificance[index]];
              var decision = decoder.readBit(contexts, contextLabel);
              if (decision) {
                var sign = this.decodeSignBit(i, j, index);
                coefficentsSign[index] = sign;
                coefficentsMagnitude[index] = 1;
                this.setNeighborsSignificance(i, j, index);
                processingFlags[index] |= firstMagnitudeBitMask;
              }
              bitsDecoded[index]++;
              processingFlags[index] |= processedMask;
            }
          }
        }
      },
      decodeSignBit: function BitModel_decodeSignBit(row, column, index) {
        var width = this.width,
            height = this.height;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var contribution, sign0, sign1, significance1;
        var contextLabel, decoded;
        significance1 = column > 0 && coefficentsMagnitude[index - 1] !== 0;
        if (column + 1 < width && coefficentsMagnitude[index + 1] !== 0) {
          sign1 = coefficentsSign[index + 1];
          if (significance1) {
            sign0 = coefficentsSign[index - 1];
            contribution = 1 - sign1 - sign0;
          } else {
            contribution = 1 - sign1 - sign1;
          }
        } else if (significance1) {
          sign0 = coefficentsSign[index - 1];
          contribution = 1 - sign0 - sign0;
        } else {
          contribution = 0;
        }
        var horizontalContribution = 3 * contribution;
        significance1 = row > 0 && coefficentsMagnitude[index - width] !== 0;
        if (row + 1 < height && coefficentsMagnitude[index + width] !== 0) {
          sign1 = coefficentsSign[index + width];
          if (significance1) {
            sign0 = coefficentsSign[index - width];
            contribution = 1 - sign1 - sign0 + horizontalContribution;
          } else {
            contribution = 1 - sign1 - sign1 + horizontalContribution;
          }
        } else if (significance1) {
          sign0 = coefficentsSign[index - width];
          contribution = 1 - sign0 - sign0 + horizontalContribution;
        } else {
          contribution = horizontalContribution;
        }
        if (contribution >= 0) {
          contextLabel = 9 + contribution;
          decoded = this.decoder.readBit(this.contexts, contextLabel);
        } else {
          contextLabel = 9 - contribution;
          decoded = this.decoder.readBit(this.contexts, contextLabel) ^ 1;
        }
        return decoded;
      },
      runMagnitudeRefinementPass: function BitModel_runMagnitudeRefinementPass() {
        var decoder = this.decoder;
        var width = this.width,
            height = this.height;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var neighborsSignificance = this.neighborsSignificance;
        var contexts = this.contexts;
        var bitsDecoded = this.bitsDecoded;
        var processingFlags = this.processingFlags;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        var length = width * height;
        var width4 = width * 4;
        for (var index0 = 0, indexNext; index0 < length; index0 = indexNext) {
          indexNext = Math.min(length, index0 + width4);
          for (var j = 0; j < width; j++) {
            for (var index = index0 + j; index < indexNext; index += width) {
              if (!coefficentsMagnitude[index] || (processingFlags[index] & processedMask) !== 0) {
                continue;
              }
              var contextLabel = 16;
              if ((processingFlags[index] & firstMagnitudeBitMask) !== 0) {
                processingFlags[index] ^= firstMagnitudeBitMask;
                var significance = neighborsSignificance[index] & 127;
                contextLabel = significance === 0 ? 15 : 14;
              }
              var bit = decoder.readBit(contexts, contextLabel);
              coefficentsMagnitude[index] = coefficentsMagnitude[index] << 1 | bit;
              bitsDecoded[index]++;
              processingFlags[index] |= processedMask;
            }
          }
        }
      },
      runCleanupPass: function BitModel_runCleanupPass() {
        var decoder = this.decoder;
        var width = this.width,
            height = this.height;
        var neighborsSignificance = this.neighborsSignificance;
        var coefficentsMagnitude = this.coefficentsMagnitude;
        var coefficentsSign = this.coefficentsSign;
        var contexts = this.contexts;
        var labels = this.contextLabelTable;
        var bitsDecoded = this.bitsDecoded;
        var processingFlags = this.processingFlags;
        var processedMask = 1;
        var firstMagnitudeBitMask = 2;
        var oneRowDown = width;
        var twoRowsDown = width * 2;
        var threeRowsDown = width * 3;
        var iNext;
        for (var i0 = 0; i0 < height; i0 = iNext) {
          iNext = Math.min(i0 + 4, height);
          var indexBase = i0 * width;
          var checkAllEmpty = i0 + 3 < height;
          for (var j = 0; j < width; j++) {
            var index0 = indexBase + j;
            var allEmpty = checkAllEmpty && processingFlags[index0] === 0 && processingFlags[index0 + oneRowDown] === 0 && processingFlags[index0 + twoRowsDown] === 0 && processingFlags[index0 + threeRowsDown] === 0 && neighborsSignificance[index0] === 0 && neighborsSignificance[index0 + oneRowDown] === 0 && neighborsSignificance[index0 + twoRowsDown] === 0 && neighborsSignificance[index0 + threeRowsDown] === 0;
            var i1 = 0,
                index = index0;
            var i = i0,
                sign;
            if (allEmpty) {
              var hasSignificantCoefficent = decoder.readBit(contexts, RUNLENGTH_CONTEXT);
              if (!hasSignificantCoefficent) {
                bitsDecoded[index0]++;
                bitsDecoded[index0 + oneRowDown]++;
                bitsDecoded[index0 + twoRowsDown]++;
                bitsDecoded[index0 + threeRowsDown]++;
                continue;
              }
              i1 = decoder.readBit(contexts, UNIFORM_CONTEXT) << 1 | decoder.readBit(contexts, UNIFORM_CONTEXT);
              if (i1 !== 0) {
                i = i0 + i1;
                index += i1 * width;
              }
              sign = this.decodeSignBit(i, j, index);
              coefficentsSign[index] = sign;
              coefficentsMagnitude[index] = 1;
              this.setNeighborsSignificance(i, j, index);
              processingFlags[index] |= firstMagnitudeBitMask;
              index = index0;
              for (var i2 = i0; i2 <= i; i2++, index += width) {
                bitsDecoded[index]++;
              }
              i1++;
            }
            for (i = i0 + i1; i < iNext; i++, index += width) {
              if (coefficentsMagnitude[index] || (processingFlags[index] & processedMask) !== 0) {
                continue;
              }
              var contextLabel = labels[neighborsSignificance[index]];
              var decision = decoder.readBit(contexts, contextLabel);
              if (decision === 1) {
                sign = this.decodeSignBit(i, j, index);
                coefficentsSign[index] = sign;
                coefficentsMagnitude[index] = 1;
                this.setNeighborsSignificance(i, j, index);
                processingFlags[index] |= firstMagnitudeBitMask;
              }
              bitsDecoded[index]++;
            }
          }
        }
      },
      checkSegmentationSymbol: function BitModel_checkSegmentationSymbol() {
        var decoder = this.decoder;
        var contexts = this.contexts;
        var symbol = decoder.readBit(contexts, UNIFORM_CONTEXT) << 3 | decoder.readBit(contexts, UNIFORM_CONTEXT) << 2 | decoder.readBit(contexts, UNIFORM_CONTEXT) << 1 | decoder.readBit(contexts, UNIFORM_CONTEXT);
        if (symbol !== 0xA) {
          error('JPX Error: Invalid segmentation symbol');
        }
      }
    };
    return BitModel;
  }();
  var Transform = function TransformClosure() {
    function Transform() {}
    Transform.prototype.calculate = function transformCalculate(subbands, u0, v0) {
      var ll = subbands[0];
      for (var i = 1, ii = subbands.length; i < ii; i++) {
        ll = this.iterate(ll, subbands[i], u0, v0);
      }
      return ll;
    };
    Transform.prototype.extend = function extend(buffer, offset, size) {
      var i1 = offset - 1,
          j1 = offset + 1;
      var i2 = offset + size - 2,
          j2 = offset + size;
      buffer[i1--] = buffer[j1++];
      buffer[j2++] = buffer[i2--];
      buffer[i1--] = buffer[j1++];
      buffer[j2++] = buffer[i2--];
      buffer[i1--] = buffer[j1++];
      buffer[j2++] = buffer[i2--];
      buffer[i1] = buffer[j1];
      buffer[j2] = buffer[i2];
    };
    Transform.prototype.iterate = function Transform_iterate(ll, hl_lh_hh, u0, v0) {
      var llWidth = ll.width,
          llHeight = ll.height,
          llItems = ll.items;
      var width = hl_lh_hh.width;
      var height = hl_lh_hh.height;
      var items = hl_lh_hh.items;
      var i, j, k, l, u, v;
      for (k = 0, i = 0; i < llHeight; i++) {
        l = i * 2 * width;
        for (j = 0; j < llWidth; j++, k++, l += 2) {
          items[l] = llItems[k];
        }
      }
      llItems = ll.items = null;
      var bufferPadding = 4;
      var rowBuffer = new Float32Array(width + 2 * bufferPadding);
      if (width === 1) {
        if ((u0 & 1) !== 0) {
          for (v = 0, k = 0; v < height; v++, k += width) {
            items[k] *= 0.5;
          }
        }
      } else {
        for (v = 0, k = 0; v < height; v++, k += width) {
          rowBuffer.set(items.subarray(k, k + width), bufferPadding);
          this.extend(rowBuffer, bufferPadding, width);
          this.filter(rowBuffer, bufferPadding, width);
          items.set(rowBuffer.subarray(bufferPadding, bufferPadding + width), k);
        }
      }
      var numBuffers = 16;
      var colBuffers = [];
      for (i = 0; i < numBuffers; i++) {
        colBuffers.push(new Float32Array(height + 2 * bufferPadding));
      }
      var b,
          currentBuffer = 0;
      ll = bufferPadding + height;
      if (height === 1) {
        if ((v0 & 1) !== 0) {
          for (u = 0; u < width; u++) {
            items[u] *= 0.5;
          }
        }
      } else {
        for (u = 0; u < width; u++) {
          if (currentBuffer === 0) {
            numBuffers = Math.min(width - u, numBuffers);
            for (k = u, l = bufferPadding; l < ll; k += width, l++) {
              for (b = 0; b < numBuffers; b++) {
                colBuffers[b][l] = items[k + b];
              }
            }
            currentBuffer = numBuffers;
          }
          currentBuffer--;
          var buffer = colBuffers[currentBuffer];
          this.extend(buffer, bufferPadding, height);
          this.filter(buffer, bufferPadding, height);
          if (currentBuffer === 0) {
            k = u - numBuffers + 1;
            for (l = bufferPadding; l < ll; k += width, l++) {
              for (b = 0; b < numBuffers; b++) {
                items[k + b] = colBuffers[b][l];
              }
            }
          }
        }
      }
      return {
        width: width,
        height: height,
        items: items
      };
    };
    return Transform;
  }();
  var IrreversibleTransform = function IrreversibleTransformClosure() {
    function IrreversibleTransform() {
      Transform.call(this);
    }
    IrreversibleTransform.prototype = Object.create(Transform.prototype);
    IrreversibleTransform.prototype.filter = function irreversibleTransformFilter(x, offset, length) {
      var len = length >> 1;
      offset = offset | 0;
      var j, n, current, next;
      var alpha = -1.586134342059924;
      var beta = -0.052980118572961;
      var gamma = 0.882911075530934;
      var delta = 0.443506852043971;
      var K = 1.230174104914001;
      var K_ = 1 / K;
      j = offset - 3;
      for (n = len + 4; n--; j += 2) {
        x[j] *= K_;
      }
      j = offset - 2;
      current = delta * x[j - 1];
      for (n = len + 3; n--; j += 2) {
        next = delta * x[j + 1];
        x[j] = K * x[j] - current - next;
        if (n--) {
          j += 2;
          current = delta * x[j + 1];
          x[j] = K * x[j] - current - next;
        } else {
          break;
        }
      }
      j = offset - 1;
      current = gamma * x[j - 1];
      for (n = len + 2; n--; j += 2) {
        next = gamma * x[j + 1];
        x[j] -= current + next;
        if (n--) {
          j += 2;
          current = gamma * x[j + 1];
          x[j] -= current + next;
        } else {
          break;
        }
      }
      j = offset;
      current = beta * x[j - 1];
      for (n = len + 1; n--; j += 2) {
        next = beta * x[j + 1];
        x[j] -= current + next;
        if (n--) {
          j += 2;
          current = beta * x[j + 1];
          x[j] -= current + next;
        } else {
          break;
        }
      }
      if (len !== 0) {
        j = offset + 1;
        current = alpha * x[j - 1];
        for (n = len; n--; j += 2) {
          next = alpha * x[j + 1];
          x[j] -= current + next;
          if (n--) {
            j += 2;
            current = alpha * x[j + 1];
            x[j] -= current + next;
          } else {
            break;
          }
        }
      }
    };
    return IrreversibleTransform;
  }();
  var ReversibleTransform = function ReversibleTransformClosure() {
    function ReversibleTransform() {
      Transform.call(this);
    }
    ReversibleTransform.prototype = Object.create(Transform.prototype);
    ReversibleTransform.prototype.filter = function reversibleTransformFilter(x, offset, length) {
      var len = length >> 1;
      offset = offset | 0;
      var j, n;
      for (j = offset, n = len + 1; n--; j += 2) {
        x[j] -= x[j - 1] + x[j + 1] + 2 >> 2;
      }
      for (j = offset + 1, n = len; n--; j += 2) {
        x[j] += x[j - 1] + x[j + 1] >> 1;
      }
    };
    return ReversibleTransform;
  }();
  return JpxImage;
}();

	
	"use strict";
    
	var Jbig2Image = function Jbig2ImageClosure() {
  function ContextCache() {}
  ContextCache.prototype = {
    getContexts: function (id) {
      if (id in this) {
        return this[id];
      }
      return this[id] = new Int8Array(1 << 16);
    }
  };
  function DecodingContext(data, start, end) {
    this.data = data;
    this.start = start;
    this.end = end;
  }
  DecodingContext.prototype = {
    get decoder() {
      var decoder = new ArithmeticDecoder(this.data, this.start, this.end);
      return shadow(this, 'decoder', decoder);
    },
    get contextCache() {
      var cache = new ContextCache();
      return shadow(this, 'contextCache', cache);
    }
  };
  function decodeInteger(contextCache, procedure, decoder) {
    var contexts = contextCache.getContexts(procedure);
    var prev = 1;
    function readBits(length) {
      var v = 0;
      for (var i = 0; i < length; i++) {
        var bit = decoder.readBit(contexts, prev);
        prev = prev < 256 ? prev << 1 | bit : (prev << 1 | bit) & 511 | 256;
        v = v << 1 | bit;
      }
      return v >>> 0;
    }
    var sign = readBits(1);
    var value = readBits(1) ? readBits(1) ? readBits(1) ? readBits(1) ? readBits(1) ? readBits(32) + 4436 : readBits(12) + 340 : readBits(8) + 84 : readBits(6) + 20 : readBits(4) + 4 : readBits(2);
    return sign === 0 ? value : value > 0 ? -value : null;
  }
  function decodeIAID(contextCache, decoder, codeLength) {
    var contexts = contextCache.getContexts('IAID');
    var prev = 1;
    for (var i = 0; i < codeLength; i++) {
      var bit = decoder.readBit(contexts, prev);
      prev = prev << 1 | bit;
    }
    if (codeLength < 31) {
      return prev & (1 << codeLength) - 1;
    }
    return prev & 0x7FFFFFFF;
  }
  var SegmentTypes = ['SymbolDictionary', null, null, null, 'IntermediateTextRegion', null, 'ImmediateTextRegion', 'ImmediateLosslessTextRegion', null, null, null, null, null, null, null, null, 'patternDictionary', null, null, null, 'IntermediateHalftoneRegion', null, 'ImmediateHalftoneRegion', 'ImmediateLosslessHalftoneRegion', null, null, null, null, null, null, null, null, null, null, null, null, 'IntermediateGenericRegion', null, 'ImmediateGenericRegion', 'ImmediateLosslessGenericRegion', 'IntermediateGenericRefinementRegion', null, 'ImmediateGenericRefinementRegion', 'ImmediateLosslessGenericRefinementRegion', null, null, null, null, 'PageInformation', 'EndOfPage', 'EndOfStripe', 'EndOfFile', 'Profiles', 'Tables', null, null, null, null, null, null, null, null, 'Extension'];
  var CodingTemplates = [[{
    x: -1,
    y: -2
  }, {
    x: 0,
    y: -2
  }, {
    x: 1,
    y: -2
  }, {
    x: -2,
    y: -1
  }, {
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: 2,
    y: -1
  }, {
    x: -4,
    y: 0
  }, {
    x: -3,
    y: 0
  }, {
    x: -2,
    y: 0
  }, {
    x: -1,
    y: 0
  }], [{
    x: -1,
    y: -2
  }, {
    x: 0,
    y: -2
  }, {
    x: 1,
    y: -2
  }, {
    x: 2,
    y: -2
  }, {
    x: -2,
    y: -1
  }, {
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: 2,
    y: -1
  }, {
    x: -3,
    y: 0
  }, {
    x: -2,
    y: 0
  }, {
    x: -1,
    y: 0
  }], [{
    x: -1,
    y: -2
  }, {
    x: 0,
    y: -2
  }, {
    x: 1,
    y: -2
  }, {
    x: -2,
    y: -1
  }, {
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: -2,
    y: 0
  }, {
    x: -1,
    y: 0
  }], [{
    x: -3,
    y: -1
  }, {
    x: -2,
    y: -1
  }, {
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 1,
    y: -1
  }, {
    x: -4,
    y: 0
  }, {
    x: -3,
    y: 0
  }, {
    x: -2,
    y: 0
  }, {
    x: -1,
    y: 0
  }]];
  var RefinementTemplates = [{
    coding: [{
      x: 0,
      y: -1
    }, {
      x: 1,
      y: -1
    }, {
      x: -1,
      y: 0
    }],
    reference: [{
      x: 0,
      y: -1
    }, {
      x: 1,
      y: -1
    }, {
      x: -1,
      y: 0
    }, {
      x: 0,
      y: 0
    }, {
      x: 1,
      y: 0
    }, {
      x: -1,
      y: 1
    }, {
      x: 0,
      y: 1
    }, {
      x: 1,
      y: 1
    }]
  }, {
    coding: [{
      x: -1,
      y: -1
    }, {
      x: 0,
      y: -1
    }, {
      x: 1,
      y: -1
    }, {
      x: -1,
      y: 0
    }],
    reference: [{
      x: 0,
      y: -1
    }, {
      x: -1,
      y: 0
    }, {
      x: 0,
      y: 0
    }, {
      x: 1,
      y: 0
    }, {
      x: 0,
      y: 1
    }, {
      x: 1,
      y: 1
    }]
  }];
  var ReusedContexts = [0x9B25, 0x0795, 0x00E5, 0x0195];
  var RefinementReusedContexts = [0x0020, 0x0008];
  function decodeBitmapTemplate0(width, height, decodingContext) {
    var decoder = decodingContext.decoder;
    var contexts = decodingContext.contextCache.getContexts('GB');
    var contextLabel,
        i,
        j,
        pixel,
        row,
        row1,
        row2,
        bitmap = [];
    var OLD_PIXEL_MASK = 0x7BF7;
    for (i = 0; i < height; i++) {
      row = bitmap[i] = new Uint8Array(width);
      row1 = i < 1 ? row : bitmap[i - 1];
      row2 = i < 2 ? row : bitmap[i - 2];
      contextLabel = row2[0] << 13 | row2[1] << 12 | row2[2] << 11 | row1[0] << 7 | row1[1] << 6 | row1[2] << 5 | row1[3] << 4;
      for (j = 0; j < width; j++) {
        row[j] = pixel = decoder.readBit(contexts, contextLabel);
        contextLabel = (contextLabel & OLD_PIXEL_MASK) << 1 | (j + 3 < width ? row2[j + 3] << 11 : 0) | (j + 4 < width ? row1[j + 4] << 4 : 0) | pixel;
      }
    }
    return bitmap;
  }
  function decodeBitmap(mmr, width, height, templateIndex, prediction, skip, at, decodingContext) {
    if (mmr) {
      error('JBIG2 error: MMR encoding is not supported');
    }
    if (templateIndex === 0 && !skip && !prediction && at.length === 4 && at[0].x === 3 && at[0].y === -1 && at[1].x === -3 && at[1].y === -1 && at[2].x === 2 && at[2].y === -2 && at[3].x === -2 && at[3].y === -2) {
      return decodeBitmapTemplate0(width, height, decodingContext);
    }
    var useskip = !!skip;
    var template = CodingTemplates[templateIndex].concat(at);
    template.sort(function (a, b) {
      return a.y - b.y || a.x - b.x;
    });
    var templateLength = template.length;
    var templateX = new Int8Array(templateLength);
    var templateY = new Int8Array(templateLength);
    var changingTemplateEntries = [];
    var reuseMask = 0,
        minX = 0,
        maxX = 0,
        minY = 0;
    var c, k;
    for (k = 0; k < templateLength; k++) {
      templateX[k] = template[k].x;
      templateY[k] = template[k].y;
      minX = Math.min(minX, template[k].x);
      maxX = Math.max(maxX, template[k].x);
      minY = Math.min(minY, template[k].y);
      if (k < templateLength - 1 && template[k].y === template[k + 1].y && template[k].x === template[k + 1].x - 1) {
        reuseMask |= 1 << templateLength - 1 - k;
      } else {
        changingTemplateEntries.push(k);
      }
    }
    var changingEntriesLength = changingTemplateEntries.length;
    var changingTemplateX = new Int8Array(changingEntriesLength);
    var changingTemplateY = new Int8Array(changingEntriesLength);
    var changingTemplateBit = new Uint16Array(changingEntriesLength);
    for (c = 0; c < changingEntriesLength; c++) {
      k = changingTemplateEntries[c];
      changingTemplateX[c] = template[k].x;
      changingTemplateY[c] = template[k].y;
      changingTemplateBit[c] = 1 << templateLength - 1 - k;
    }
    var sbb_left = -minX;
    var sbb_top = -minY;
    var sbb_right = width - maxX;
    var pseudoPixelContext = ReusedContexts[templateIndex];
    var row = new Uint8Array(width);
    var bitmap = [];
    var decoder = decodingContext.decoder;
    var contexts = decodingContext.contextCache.getContexts('GB');
    var ltp = 0,
        j,
        i0,
        j0,
        contextLabel = 0,
        bit,
        shift;
    for (var i = 0; i < height; i++) {
      if (prediction) {
        var sltp = decoder.readBit(contexts, pseudoPixelContext);
        ltp ^= sltp;
        if (ltp) {
          bitmap.push(row);
          continue;
        }
      }
      row = new Uint8Array(row);
      bitmap.push(row);
      for (j = 0; j < width; j++) {
        if (useskip && skip[i][j]) {
          row[j] = 0;
          continue;
        }
        if (j >= sbb_left && j < sbb_right && i >= sbb_top) {
          contextLabel = contextLabel << 1 & reuseMask;
          for (k = 0; k < changingEntriesLength; k++) {
            i0 = i + changingTemplateY[k];
            j0 = j + changingTemplateX[k];
            bit = bitmap[i0][j0];
            if (bit) {
              bit = changingTemplateBit[k];
              contextLabel |= bit;
            }
          }
        } else {
          contextLabel = 0;
          shift = templateLength - 1;
          for (k = 0; k < templateLength; k++, shift--) {
            j0 = j + templateX[k];
            if (j0 >= 0 && j0 < width) {
              i0 = i + templateY[k];
              if (i0 >= 0) {
                bit = bitmap[i0][j0];
                if (bit) {
                  contextLabel |= bit << shift;
                }
              }
            }
          }
        }
        var pixel = decoder.readBit(contexts, contextLabel);
        row[j] = pixel;
      }
    }
    return bitmap;
  }
  function decodeRefinement(width, height, templateIndex, referenceBitmap, offsetX, offsetY, prediction, at, decodingContext) {
    var codingTemplate = RefinementTemplates[templateIndex].coding;
    if (templateIndex === 0) {
      codingTemplate = codingTemplate.concat([at[0]]);
    }
    var codingTemplateLength = codingTemplate.length;
    var codingTemplateX = new Int32Array(codingTemplateLength);
    var codingTemplateY = new Int32Array(codingTemplateLength);
    var k;
    for (k = 0; k < codingTemplateLength; k++) {
      codingTemplateX[k] = codingTemplate[k].x;
      codingTemplateY[k] = codingTemplate[k].y;
    }
    var referenceTemplate = RefinementTemplates[templateIndex].reference;
    if (templateIndex === 0) {
      referenceTemplate = referenceTemplate.concat([at[1]]);
    }
    var referenceTemplateLength = referenceTemplate.length;
    var referenceTemplateX = new Int32Array(referenceTemplateLength);
    var referenceTemplateY = new Int32Array(referenceTemplateLength);
    for (k = 0; k < referenceTemplateLength; k++) {
      referenceTemplateX[k] = referenceTemplate[k].x;
      referenceTemplateY[k] = referenceTemplate[k].y;
    }
    var referenceWidth = referenceBitmap[0].length;
    var referenceHeight = referenceBitmap.length;
    var pseudoPixelContext = RefinementReusedContexts[templateIndex];
    var bitmap = [];
    var decoder = decodingContext.decoder;
    var contexts = decodingContext.contextCache.getContexts('GR');
    var ltp = 0;
    for (var i = 0; i < height; i++) {
      if (prediction) {
        var sltp = decoder.readBit(contexts, pseudoPixelContext);
        ltp ^= sltp;
        if (ltp) {
          error('JBIG2 error: prediction is not supported');
        }
      }
      var row = new Uint8Array(width);
      bitmap.push(row);
      for (var j = 0; j < width; j++) {
        var i0, j0;
        var contextLabel = 0;
        for (k = 0; k < codingTemplateLength; k++) {
          i0 = i + codingTemplateY[k];
          j0 = j + codingTemplateX[k];
          if (i0 < 0 || j0 < 0 || j0 >= width) {
            contextLabel <<= 1;
          } else {
            contextLabel = contextLabel << 1 | bitmap[i0][j0];
          }
        }
        for (k = 0; k < referenceTemplateLength; k++) {
          i0 = i + referenceTemplateY[k] + offsetY;
          j0 = j + referenceTemplateX[k] + offsetX;
          if (i0 < 0 || i0 >= referenceHeight || j0 < 0 || j0 >= referenceWidth) {
            contextLabel <<= 1;
          } else {
            contextLabel = contextLabel << 1 | referenceBitmap[i0][j0];
          }
        }
        var pixel = decoder.readBit(contexts, contextLabel);
        row[j] = pixel;
      }
    }
    return bitmap;
  }
  function decodeSymbolDictionary(huffman, refinement, symbols, numberOfNewSymbols, numberOfExportedSymbols, huffmanTables, templateIndex, at, refinementTemplateIndex, refinementAt, decodingContext) {
    if (huffman) {
      error('JBIG2 error: huffman is not supported');
    }
    var newSymbols = [];
    var currentHeight = 0;
    var symbolCodeLength = log2(symbols.length + numberOfNewSymbols);
    var decoder = decodingContext.decoder;
    var contextCache = decodingContext.contextCache;
    while (newSymbols.length < numberOfNewSymbols) {
      var deltaHeight = decodeInteger(contextCache, 'IADH', decoder);
      currentHeight += deltaHeight;
      var currentWidth = 0;
      while (true) {
        var deltaWidth = decodeInteger(contextCache, 'IADW', decoder);
        if (deltaWidth === null) {
          break;
        }
        currentWidth += deltaWidth;
        var bitmap;
        if (refinement) {
          var numberOfInstances = decodeInteger(contextCache, 'IAAI', decoder);
          if (numberOfInstances > 1) {
            bitmap = decodeTextRegion(huffman, refinement, currentWidth, currentHeight, 0, numberOfInstances, 1, symbols.concat(newSymbols), symbolCodeLength, 0, 0, 1, 0, huffmanTables, refinementTemplateIndex, refinementAt, decodingContext);
          } else {
            var symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
            var rdx = decodeInteger(contextCache, 'IARDX', decoder);
            var rdy = decodeInteger(contextCache, 'IARDY', decoder);
            var symbol = symbolId < symbols.length ? symbols[symbolId] : newSymbols[symbolId - symbols.length];
            bitmap = decodeRefinement(currentWidth, currentHeight, refinementTemplateIndex, symbol, rdx, rdy, false, refinementAt, decodingContext);
          }
        } else {
          bitmap = decodeBitmap(false, currentWidth, currentHeight, templateIndex, false, null, at, decodingContext);
        }
        newSymbols.push(bitmap);
      }
    }
    var exportedSymbols = [];
    var flags = [],
        currentFlag = false;
    var totalSymbolsLength = symbols.length + numberOfNewSymbols;
    while (flags.length < totalSymbolsLength) {
      var runLength = decodeInteger(contextCache, 'IAEX', decoder);
      while (runLength--) {
        flags.push(currentFlag);
      }
      currentFlag = !currentFlag;
    }
    for (var i = 0, ii = symbols.length; i < ii; i++) {
      if (flags[i]) {
        exportedSymbols.push(symbols[i]);
      }
    }
    for (var j = 0; j < numberOfNewSymbols; i++, j++) {
      if (flags[i]) {
        exportedSymbols.push(newSymbols[j]);
      }
    }
    return exportedSymbols;
  }
  function decodeTextRegion(huffman, refinement, width, height, defaultPixelValue, numberOfSymbolInstances, stripSize, inputSymbols, symbolCodeLength, transposed, dsOffset, referenceCorner, combinationOperator, huffmanTables, refinementTemplateIndex, refinementAt, decodingContext) {
    if (huffman) {
      error('JBIG2 error: huffman is not supported');
    }
    var bitmap = [];
    var i, row;
    for (i = 0; i < height; i++) {
      row = new Uint8Array(width);
      if (defaultPixelValue) {
        for (var j = 0; j < width; j++) {
          row[j] = defaultPixelValue;
        }
      }
      bitmap.push(row);
    }
    var decoder = decodingContext.decoder;
    var contextCache = decodingContext.contextCache;
    var stripT = -decodeInteger(contextCache, 'IADT', decoder);
    var firstS = 0;
    i = 0;
    while (i < numberOfSymbolInstances) {
      var deltaT = decodeInteger(contextCache, 'IADT', decoder);
      stripT += deltaT;
      var deltaFirstS = decodeInteger(contextCache, 'IAFS', decoder);
      firstS += deltaFirstS;
      var currentS = firstS;
      do {
        var currentT = stripSize === 1 ? 0 : decodeInteger(contextCache, 'IAIT', decoder);
        var t = stripSize * stripT + currentT;
        var symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
        var applyRefinement = refinement && decodeInteger(contextCache, 'IARI', decoder);
        var symbolBitmap = inputSymbols[symbolId];
        var symbolWidth = symbolBitmap[0].length;
        var symbolHeight = symbolBitmap.length;
        if (applyRefinement) {
          var rdw = decodeInteger(contextCache, 'IARDW', decoder);
          var rdh = decodeInteger(contextCache, 'IARDH', decoder);
          var rdx = decodeInteger(contextCache, 'IARDX', decoder);
          var rdy = decodeInteger(contextCache, 'IARDY', decoder);
          symbolWidth += rdw;
          symbolHeight += rdh;
          symbolBitmap = decodeRefinement(symbolWidth, symbolHeight, refinementTemplateIndex, symbolBitmap, (rdw >> 1) + rdx, (rdh >> 1) + rdy, false, refinementAt, decodingContext);
        }
        var offsetT = t - (referenceCorner & 1 ? 0 : symbolHeight);
        var offsetS = currentS - (referenceCorner & 2 ? symbolWidth : 0);
        var s2, t2, symbolRow;
        if (transposed) {
          for (s2 = 0; s2 < symbolHeight; s2++) {
            row = bitmap[offsetS + s2];
            if (!row) {
              continue;
            }
            symbolRow = symbolBitmap[s2];
            var maxWidth = Math.min(width - offsetT, symbolWidth);
            switch (combinationOperator) {
              case 0:
                for (t2 = 0; t2 < maxWidth; t2++) {
                  row[offsetT + t2] |= symbolRow[t2];
                }
                break;
              case 2:
                for (t2 = 0; t2 < maxWidth; t2++) {
                  row[offsetT + t2] ^= symbolRow[t2];
                }
                break;
              default:
                error('JBIG2 error: operator ' + combinationOperator + ' is not supported');
            }
          }
          currentS += symbolHeight - 1;
        } else {
          for (t2 = 0; t2 < symbolHeight; t2++) {
            row = bitmap[offsetT + t2];
            if (!row) {
              continue;
            }
            symbolRow = symbolBitmap[t2];
            switch (combinationOperator) {
              case 0:
                for (s2 = 0; s2 < symbolWidth; s2++) {
                  row[offsetS + s2] |= symbolRow[s2];
                }
                break;
              case 2:
                for (s2 = 0; s2 < symbolWidth; s2++) {
                  row[offsetS + s2] ^= symbolRow[s2];
                }
                break;
              default:
                error('JBIG2 error: operator ' + combinationOperator + ' is not supported');
            }
          }
          currentS += symbolWidth - 1;
        }
        i++;
        var deltaS = decodeInteger(contextCache, 'IADS', decoder);
        if (deltaS === null) {
          break;
        }
        currentS += deltaS + dsOffset;
      } while (true);
    }
    return bitmap;
  }
  function readSegmentHeader(data, start) {
    var segmentHeader = {};
    segmentHeader.number = readUint32(data, start);
    var flags = data[start + 4];
    var segmentType = flags & 0x3F;
    if (!SegmentTypes[segmentType]) {
      error('JBIG2 error: invalid segment type: ' + segmentType);
    }
    segmentHeader.type = segmentType;
    segmentHeader.typeName = SegmentTypes[segmentType];
    segmentHeader.deferredNonRetain = !!(flags & 0x80);
    var pageAssociationFieldSize = !!(flags & 0x40);
    var referredFlags = data[start + 5];
    var referredToCount = referredFlags >> 5 & 7;
    var retainBits = [referredFlags & 31];
    var position = start + 6;
    if (referredFlags === 7) {
      referredToCount = readUint32(data, position - 1) & 0x1FFFFFFF;
      position += 3;
      var bytes = referredToCount + 7 >> 3;
      retainBits[0] = data[position++];
      while (--bytes > 0) {
        retainBits.push(data[position++]);
      }
    } else if (referredFlags === 5 || referredFlags === 6) {
      error('JBIG2 error: invalid referred-to flags');
    }
    segmentHeader.retainBits = retainBits;
    var referredToSegmentNumberSize = segmentHeader.number <= 256 ? 1 : segmentHeader.number <= 65536 ? 2 : 4;
    var referredTo = [];
    var i, ii;
    for (i = 0; i < referredToCount; i++) {
      var number = referredToSegmentNumberSize === 1 ? data[position] : referredToSegmentNumberSize === 2 ? readUint16(data, position) : readUint32(data, position);
      referredTo.push(number);
      position += referredToSegmentNumberSize;
    }
    segmentHeader.referredTo = referredTo;
    if (!pageAssociationFieldSize) {
      segmentHeader.pageAssociation = data[position++];
    } else {
      segmentHeader.pageAssociation = readUint32(data, position);
      position += 4;
    }
    segmentHeader.length = readUint32(data, position);
    position += 4;
    if (segmentHeader.length === 0xFFFFFFFF) {
      if (segmentType === 38) {
        var genericRegionInfo = readRegionSegmentInformation(data, position);
        var genericRegionSegmentFlags = data[position + RegionSegmentInformationFieldLength];
        var genericRegionMmr = !!(genericRegionSegmentFlags & 1);
        var searchPatternLength = 6;
        var searchPattern = new Uint8Array(searchPatternLength);
        if (!genericRegionMmr) {
          searchPattern[0] = 0xFF;
          searchPattern[1] = 0xAC;
        }
        searchPattern[2] = genericRegionInfo.height >>> 24 & 0xFF;
        searchPattern[3] = genericRegionInfo.height >> 16 & 0xFF;
        searchPattern[4] = genericRegionInfo.height >> 8 & 0xFF;
        searchPattern[5] = genericRegionInfo.height & 0xFF;
        for (i = position, ii = data.length; i < ii; i++) {
          var j = 0;
          while (j < searchPatternLength && searchPattern[j] === data[i + j]) {
            j++;
          }
          if (j === searchPatternLength) {
            segmentHeader.length = i + searchPatternLength;
            break;
          }
        }
        if (segmentHeader.length === 0xFFFFFFFF) {
          error('JBIG2 error: segment end was not found');
        }
      } else {
        error('JBIG2 error: invalid unknown segment length');
      }
    }
    segmentHeader.headerEnd = position;
    return segmentHeader;
  }
  function readSegments(header, data, start, end) {
    var segments = [];
    var position = start;
    while (position < end) {
      var segmentHeader = readSegmentHeader(data, position);
      position = segmentHeader.headerEnd;
      var segment = {
        header: segmentHeader,
        data: data
      };
      if (!header.randomAccess) {
        segment.start = position;
        position += segmentHeader.length;
        segment.end = position;
      }
      segments.push(segment);
      if (segmentHeader.type === 51) {
        break;
      }
    }
    if (header.randomAccess) {
      for (var i = 0, ii = segments.length; i < ii; i++) {
        segments[i].start = position;
        position += segments[i].header.length;
        segments[i].end = position;
      }
    }
    return segments;
  }
  function readRegionSegmentInformation(data, start) {
    return {
      width: readUint32(data, start),
      height: readUint32(data, start + 4),
      x: readUint32(data, start + 8),
      y: readUint32(data, start + 12),
      combinationOperator: data[start + 16] & 7
    };
  }
  var RegionSegmentInformationFieldLength = 17;
  function processSegment(segment, visitor) {
    var header = segment.header;
    var data = segment.data,
        position = segment.start,
        end = segment.end;
    var args, at, i, atLength;
    switch (header.type) {
      case 0:
        var dictionary = {};
        var dictionaryFlags = readUint16(data, position);
        dictionary.huffman = !!(dictionaryFlags & 1);
        dictionary.refinement = !!(dictionaryFlags & 2);
        dictionary.huffmanDHSelector = dictionaryFlags >> 2 & 3;
        dictionary.huffmanDWSelector = dictionaryFlags >> 4 & 3;
        dictionary.bitmapSizeSelector = dictionaryFlags >> 6 & 1;
        dictionary.aggregationInstancesSelector = dictionaryFlags >> 7 & 1;
        dictionary.bitmapCodingContextUsed = !!(dictionaryFlags & 256);
        dictionary.bitmapCodingContextRetained = !!(dictionaryFlags & 512);
        dictionary.template = dictionaryFlags >> 10 & 3;
        dictionary.refinementTemplate = dictionaryFlags >> 12 & 1;
        position += 2;
        if (!dictionary.huffman) {
          atLength = dictionary.template === 0 ? 4 : 1;
          at = [];
          for (i = 0; i < atLength; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          dictionary.at = at;
        }
        if (dictionary.refinement && !dictionary.refinementTemplate) {
          at = [];
          for (i = 0; i < 2; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          dictionary.refinementAt = at;
        }
        dictionary.numberOfExportedSymbols = readUint32(data, position);
        position += 4;
        dictionary.numberOfNewSymbols = readUint32(data, position);
        position += 4;
        args = [dictionary, header.number, header.referredTo, data, position, end];
        break;
      case 6:
      case 7:
        var textRegion = {};
        textRegion.info = readRegionSegmentInformation(data, position);
        position += RegionSegmentInformationFieldLength;
        var textRegionSegmentFlags = readUint16(data, position);
        position += 2;
        textRegion.huffman = !!(textRegionSegmentFlags & 1);
        textRegion.refinement = !!(textRegionSegmentFlags & 2);
        textRegion.stripSize = 1 << (textRegionSegmentFlags >> 2 & 3);
        textRegion.referenceCorner = textRegionSegmentFlags >> 4 & 3;
        textRegion.transposed = !!(textRegionSegmentFlags & 64);
        textRegion.combinationOperator = textRegionSegmentFlags >> 7 & 3;
        textRegion.defaultPixelValue = textRegionSegmentFlags >> 9 & 1;
        textRegion.dsOffset = textRegionSegmentFlags << 17 >> 27;
        textRegion.refinementTemplate = textRegionSegmentFlags >> 15 & 1;
        if (textRegion.huffman) {
          var textRegionHuffmanFlags = readUint16(data, position);
          position += 2;
          textRegion.huffmanFS = textRegionHuffmanFlags & 3;
          textRegion.huffmanDS = textRegionHuffmanFlags >> 2 & 3;
          textRegion.huffmanDT = textRegionHuffmanFlags >> 4 & 3;
          textRegion.huffmanRefinementDW = textRegionHuffmanFlags >> 6 & 3;
          textRegion.huffmanRefinementDH = textRegionHuffmanFlags >> 8 & 3;
          textRegion.huffmanRefinementDX = textRegionHuffmanFlags >> 10 & 3;
          textRegion.huffmanRefinementDY = textRegionHuffmanFlags >> 12 & 3;
          textRegion.huffmanRefinementSizeSelector = !!(textRegionHuffmanFlags & 14);
        }
        if (textRegion.refinement && !textRegion.refinementTemplate) {
          at = [];
          for (i = 0; i < 2; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          textRegion.refinementAt = at;
        }
        textRegion.numberOfSymbolInstances = readUint32(data, position);
        position += 4;
        if (textRegion.huffman) {
          error('JBIG2 error: huffman is not supported');
        }
        args = [textRegion, header.referredTo, data, position, end];
        break;
      case 38:
      case 39:
        var genericRegion = {};
        genericRegion.info = readRegionSegmentInformation(data, position);
        position += RegionSegmentInformationFieldLength;
        var genericRegionSegmentFlags = data[position++];
        genericRegion.mmr = !!(genericRegionSegmentFlags & 1);
        genericRegion.template = genericRegionSegmentFlags >> 1 & 3;
        genericRegion.prediction = !!(genericRegionSegmentFlags & 8);
        if (!genericRegion.mmr) {
          atLength = genericRegion.template === 0 ? 4 : 1;
          at = [];
          for (i = 0; i < atLength; i++) {
            at.push({
              x: readInt8(data, position),
              y: readInt8(data, position + 1)
            });
            position += 2;
          }
          genericRegion.at = at;
        }
        args = [genericRegion, data, position, end];
        break;
      case 48:
        var pageInfo = {
          width: readUint32(data, position),
          height: readUint32(data, position + 4),
          resolutionX: readUint32(data, position + 8),
          resolutionY: readUint32(data, position + 12)
        };
        if (pageInfo.height === 0xFFFFFFFF) {
          delete pageInfo.height;
        }
        var pageSegmentFlags = data[position + 16];
        readUint16(data, position + 17);
        pageInfo.lossless = !!(pageSegmentFlags & 1);
        pageInfo.refinement = !!(pageSegmentFlags & 2);
        pageInfo.defaultPixelValue = pageSegmentFlags >> 2 & 1;
        pageInfo.combinationOperator = pageSegmentFlags >> 3 & 3;
        pageInfo.requiresBuffer = !!(pageSegmentFlags & 32);
        pageInfo.combinationOperatorOverride = !!(pageSegmentFlags & 64);
        args = [pageInfo];
        break;
      case 49:
        break;
      case 50:
        break;
      case 51:
        break;
      case 62:
        break;
      default:
        error('JBIG2 error: segment type ' + header.typeName + '(' + header.type + ') is not implemented');
    }
    var callbackName = 'on' + header.typeName;
    if (callbackName in visitor) {
      visitor[callbackName].apply(visitor, args);
    }
  }
  function processSegments(segments, visitor) {
    for (var i = 0, ii = segments.length; i < ii; i++) {
      processSegment(segments[i], visitor);
    }
  }
  function parseJbig2(data, start, end) {
    var position = start;
    if (data[position] !== 0x97 || data[position + 1] !== 0x4A || data[position + 2] !== 0x42 || data[position + 3] !== 0x32 || data[position + 4] !== 0x0D || data[position + 5] !== 0x0A || data[position + 6] !== 0x1A || data[position + 7] !== 0x0A) {
      error('JBIG2 error: invalid header');
    }
    var header = {};
    position += 8;
    var flags = data[position++];
    header.randomAccess = !(flags & 1);
    if (!(flags & 2)) {
      header.numberOfPages = readUint32(data, position);
      position += 4;
    }
    readSegments(header, data, position, end);
    error('Not implemented');
  }
  function parseJbig2Chunks(chunks) {
    var visitor = new SimpleSegmentVisitor();
    for (var i = 0, ii = chunks.length; i < ii; i++) {
      var chunk = chunks[i];
      var segments = readSegments({}, chunk.data, chunk.start, chunk.end);
      processSegments(segments, visitor);
    }
    return visitor.buffer;
  }
  function SimpleSegmentVisitor() {}
  SimpleSegmentVisitor.prototype = {
    onPageInformation: function SimpleSegmentVisitor_onPageInformation(info) {
      this.currentPageInfo = info;
      var rowSize = info.width + 7 >> 3;
      var buffer = new Uint8Array(rowSize * info.height);
      if (info.defaultPixelValue) {
        for (var i = 0, ii = buffer.length; i < ii; i++) {
          buffer[i] = 0xFF;
        }
      }
      this.buffer = buffer;
    },
    drawBitmap: function SimpleSegmentVisitor_drawBitmap(regionInfo, bitmap) {
      var pageInfo = this.currentPageInfo;
      var width = regionInfo.width,
          height = regionInfo.height;
      var rowSize = pageInfo.width + 7 >> 3;
      var combinationOperator = pageInfo.combinationOperatorOverride ? regionInfo.combinationOperator : pageInfo.combinationOperator;
      var buffer = this.buffer;
      var mask0 = 128 >> (regionInfo.x & 7);
      var offset0 = regionInfo.y * rowSize + (regionInfo.x >> 3);
      var i, j, mask, offset;
      switch (combinationOperator) {
        case 0:
          for (i = 0; i < height; i++) {
            mask = mask0;
            offset = offset0;
            for (j = 0; j < width; j++) {
              if (bitmap[i][j]) {
                buffer[offset] |= mask;
              }
              mask >>= 1;
              if (!mask) {
                mask = 128;
                offset++;
              }
            }
            offset0 += rowSize;
          }
          break;
        case 2:
          for (i = 0; i < height; i++) {
            mask = mask0;
            offset = offset0;
            for (j = 0; j < width; j++) {
              if (bitmap[i][j]) {
                buffer[offset] ^= mask;
              }
              mask >>= 1;
              if (!mask) {
                mask = 128;
                offset++;
              }
            }
            offset0 += rowSize;
          }
          break;
        default:
          error('JBIG2 error: operator ' + combinationOperator + ' is not supported');
      }
    },
    onImmediateGenericRegion: function SimpleSegmentVisitor_onImmediateGenericRegion(region, data, start, end) {
      var regionInfo = region.info;
      var decodingContext = new DecodingContext(data, start, end);
      var bitmap = decodeBitmap(region.mmr, regionInfo.width, regionInfo.height, region.template, region.prediction, null, region.at, decodingContext);
      this.drawBitmap(regionInfo, bitmap);
    },
    onImmediateLosslessGenericRegion: function SimpleSegmentVisitor_onImmediateLosslessGenericRegion() {
      this.onImmediateGenericRegion.apply(this, arguments);
    },
    onSymbolDictionary: function SimpleSegmentVisitor_onSymbolDictionary(dictionary, currentSegment, referredSegments, data, start, end) {
      var huffmanTables;
      if (dictionary.huffman) {
        error('JBIG2 error: huffman is not supported');
      }
      var symbols = this.symbols;
      if (!symbols) {
        this.symbols = symbols = {};
      }
      var inputSymbols = [];
      for (var i = 0, ii = referredSegments.length; i < ii; i++) {
        inputSymbols = inputSymbols.concat(symbols[referredSegments[i]]);
      }
      var decodingContext = new DecodingContext(data, start, end);
      symbols[currentSegment] = decodeSymbolDictionary(dictionary.huffman, dictionary.refinement, inputSymbols, dictionary.numberOfNewSymbols, dictionary.numberOfExportedSymbols, huffmanTables, dictionary.template, dictionary.at, dictionary.refinementTemplate, dictionary.refinementAt, decodingContext);
    },
    onImmediateTextRegion: function SimpleSegmentVisitor_onImmediateTextRegion(region, referredSegments, data, start, end) {
      var regionInfo = region.info;
      var huffmanTables;
      var symbols = this.symbols;
      var inputSymbols = [];
      for (var i = 0, ii = referredSegments.length; i < ii; i++) {
        inputSymbols = inputSymbols.concat(symbols[referredSegments[i]]);
      }
      var symbolCodeLength = log2(inputSymbols.length);
      var decodingContext = new DecodingContext(data, start, end);
      var bitmap = decodeTextRegion(region.huffman, region.refinement, regionInfo.width, regionInfo.height, region.defaultPixelValue, region.numberOfSymbolInstances, region.stripSize, inputSymbols, symbolCodeLength, region.transposed, region.dsOffset, region.referenceCorner, region.combinationOperator, huffmanTables, region.refinementTemplate, region.refinementAt, decodingContext);
      this.drawBitmap(regionInfo, bitmap);
    },
    onImmediateLosslessTextRegion: function SimpleSegmentVisitor_onImmediateLosslessTextRegion() {
      this.onImmediateTextRegion.apply(this, arguments);
    }
  };
  function Jbig2Image() {}
  Jbig2Image.prototype = {
    parseChunks: function Jbig2Image_parseChunks(chunks) {
      return parseJbig2Chunks(chunks);
    }
  };
  return Jbig2Image;
}();


	
	
	
	function log2(x) {
        var n = 1, i = 0;
        while (x > n) {
            n <<= 1;
            i++;
        }
        return i;
    }
    function readInt8(data, start) {
        return data[start] << 24 >> 24;
    }
    function readUint16(data, offset) {
        return data[offset] << 8 | data[offset + 1];
    }
    function readUint32(data, offset) {
        return (data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3]) >>> 0;
    }
    function shadow(obj, prop, value) {
        Object.defineProperty(obj, prop, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: false
        });
        return value;
    }
    var error = function() {
        console.error.apply(console, arguments);
        throw new Error("PDFJS error: " + arguments[0]);
    };
    var warn = function() {
        console.warn.apply(console, arguments);
    };
    var info = function() {
        console.info.apply(console, arguments);
    };
    Jbig2Image.prototype.parse = function parseJbig2(data) {
        var position = 0, end = data.length;
        if (data[position] !== 151 || data[position + 1] !== 74 || data[position + 2] !== 66 || data[position + 3] !== 50 || data[position + 4] !== 13 || data[position + 5] !== 10 || data[position + 6] !== 26 || data[position + 7] !== 10) {
            error("JBIG2 error: invalid header");
        }
        var header = {};
        position += 8;
        var flags = data[position++];
        header.randomAccess = !(flags & 1);
        if (!(flags & 2)) {
            header.numberOfPages = readUint32(data, position);
            position += 4;
        }
        var visitor = this.parseChunks([ {
            data: data,
            start: position,
            end: end
        } ]);
        var width = visitor.currentPageInfo.width;
        var height = visitor.currentPageInfo.height;
        var bitPacked = visitor.buffer;
        var data = new Uint8Array(width * height);
        var q = 0, k = 0;
        for (var i = 0; i < height; i++) {
            var mask = 0, buffer;
            for (var j = 0; j < width; j++) {
                if (!mask) {
                    mask = 128;
                    buffer = bitPacked[k++];
                }
                data[q++] = buffer & mask ? 0 : 255;
                mask >>= 1;
            }
        }
        this.width = width;
        this.height = height;
        this.data = data;
    };
    PDFJS.JpegImage = JpegImage;
    PDFJS.JpxImage = JpxImage;
    PDFJS.Jbig2Image = Jbig2Image;
})(PDFJS || (PDFJS = {}));


;(function(){var o,X=0,e=null,n=null;o=window.FFT={};var f={o:function(G){if(G!==0&&(G&G-1)===0){X=G;
f.B();f.q();f.i()}else{throw new Error("init: radix-2 required")}},X:function(G,B){f.G(G,B,1)},e:function(G,B){var j=1/X;
f.G(G,B,-1);for(var q=0;q<X;q++){G[q]*=j;B[q]*=j}},n:function(G,B){var j=[],q=[],i=0;for(var m=0;m<X;
m++){i=m*X;for(var Z=0;Z<X;Z++){j[Z]=G[Z+i];q[Z]=B[Z+i]}f.X(j,q);for(var p=0;p<X;p++){G[p+i]=j[p];B[p+i]=q[p]}}for(var C=0;
C<X;C++){for(var a=0;a<X;a++){i=C+a*X;j[a]=G[i];q[a]=B[i]}f.X(j,q);for(var r=0;r<X;r++){i=C+r*X;G[i]=j[r];
B[i]=q[r]}}},f:function(G,B){var j=[],q=[],i=0;for(var m=0;m<X;m++){i=m*X;for(var Z=0;Z<X;Z++){j[Z]=G[Z+i];
q[Z]=B[Z+i]}f.e(j,q);for(var p=0;p<X;p++){G[p+i]=j[p];B[p+i]=q[p]}}for(var C=0;C<X;C++){for(var a=0;
a<X;a++){i=C+a*X;j[a]=G[i];q[a]=B[i]}f.e(j,q);for(var r=0;r<X;r++){i=C+r*X;G[i]=j[r];B[i]=q[r]}}},G:function(G,B,j){var q,i,m,Z,p,C,a,r,M,R=X>>2;
for(var P=0;P<X;P++){Z=e[P];if(P<Z){p=G[P];G[P]=G[Z];G[Z]=p;p=B[P];B[P]=B[Z];B[Z]=p}}for(var y=1;y<X;
y<<=1){i=0;q=X/(y<<1);for(var x=0;x<y;x++){C=n[i+R];a=j*n[i];for(var t=x;t<X;t+=y<<1){m=t+y;r=C*G[m]+a*B[m];
M=C*B[m]-a*G[m];G[m]=G[t]-r;G[t]+=r;B[m]=B[t]-M;B[t]+=M}i+=q}}},B:function(){var G=Uint32Array;if(X<=256)G=Uint8Array;
else if(X<=65536)G=Uint16Array;e=new G(X);n=new Float64Array(X*1.25)},j:function(){},q:function(){var G=0,B=0,q=0;
e[0]=0;while(++G<X){q=X>>1;while(q<=B){B-=q;q>>=1}B+=q;e[G]=B}},i:function(){var G=X>>1,B=X>>2,j=X>>3,q=G+B,i=Math.sin(Math.PI/X),m=2*i*i,Z=Math.sqrt(m*(2-m)),p=n[B]=1,C=n[0]=0;
i=2*m;for(var a=1;a<j;a++){p-=m;m+=i*p;C+=Z;Z-=i*C;n[a]=C;n[B-a]=p}if(j!==0){n[j]=Math.sqrt(.5)}for(var r=0;
r<B;r++){n[G-r]=n[r]}for(var M=0;M<q;M++){n[M+G]=-n[M]}}};o.init=f.o;o.fft2d=f.n;o.ifft2d=f.f}.call(this));
	
(function(r){"object"===typeof exports&&"undefined"!==typeof module?module.exports=r():"function"===typeof define&&define.amd?define([],r):("undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:this).acorn=r()})(function(){return function a(l,f,c){function g(d,n){if(!f[d]){if(!l[d]){var e="function"==typeof require&&require;if(!n&&e)return e(d,!0);if(b)return b(d,!0);e=Error("Cannot find module '"+d+"'");throw e.code="MODULE_NOT_FOUND",e;}e=f[d]={exports:{}};
l[d][0].call(e.exports,function(b){var e=l[d][1][b];return g(e?e:b)},e,e.exports,a,l,f,c)}return f[d].exports}for(var b="function"==typeof require&&require,d=0;d<c.length;d++)g(c[d]);return g}({1:[function(a,l,f){var c=a("./tokentype");a=a("./state").Parser.prototype;a.checkPropClash=function(b,c){if(!(6<=this.options.ecmaVersion&&(b.computed||b.method||b.shorthand))){var d=b.key;switch(d.type){case "Identifier":var a=d.name;break;case "Literal":a=String(d.value);break;default:return}var e=b.kind;
if(6<=this.options.ecmaVersion)"__proto__"===a&&"init"===e&&(c.proto&&this.raiseRecoverable(d.start,"Redefinition of __proto__ property"),c.proto=!0);else{a="$"+a;var m=c[a];m?(a="init"!==e,(!this.strict&&!a||!m[e])&&a^m.init||this.raiseRecoverable(d.start,"Redefinition of property")):m=c[a]={init:!1,get:!1,set:!1};m[e]=!0}}};a.parseExpression=function(b,a){var d=this.start,n=this.startLoc,e=this.parseMaybeAssign(b,a);if(this.type===c.types.comma){d=this.startNodeAt(d,n);for(d.expressions=[e];this.eat(c.types.comma);)d.expressions.push(this.parseMaybeAssign(b,
a));return this.finishNode(d,"SequenceExpression")}return e};a.parseMaybeAssign=function(b,a,h){if(this.inGenerator&&this.isContextual("yield"))return this.parseYield();var d=!1;a||(a={shorthandAssign:0,trailingComma:0},d=!0);var e=this.start,m=this.startLoc;if(this.type==c.types.parenL||this.type==c.types.name)this.potentialArrowAt=this.start;var p=this.parseMaybeConditional(b,a);h&&(p=h.call(this,p,e,m));if(this.type.isAssign)return d&&this.checkPatternErrors(a,!0),h=this.startNodeAt(e,m),h.operator=
this.value,h.left=this.type===c.types.eq?this.toAssignable(p):p,a.shorthandAssign=0,this.checkLVal(p),this.next(),h.right=this.parseMaybeAssign(b),this.finishNode(h,"AssignmentExpression");d&&this.checkExpressionErrors(a,!0);return p};a.parseMaybeConditional=function(b,a){var d=this.start,n=this.startLoc,e=this.parseExprOps(b,a);return this.checkExpressionErrors(a)?e:this.eat(c.types.question)?(d=this.startNodeAt(d,n),d.test=e,d.consequent=this.parseMaybeAssign(),this.expect(c.types.colon),d.alternate=
this.parseMaybeAssign(b),this.finishNode(d,"ConditionalExpression")):e};a.parseExprOps=function(b,c){var a=this.start,d=this.startLoc,e=this.parseMaybeUnary(c,!1);return this.checkExpressionErrors(c)?e:this.parseExprOp(e,a,d,-1,b)};a.parseExprOp=function(b,a,h,n,e){var d=this.type.binop;if(null!=d&&(!e||this.type!==c.types._in)&&d>n){var p=this.type===c.types.logicalOR||this.type===c.types.logicalAND,g=this.value;this.next();var k=this.start,q=this.startLoc,d=this.parseExprOp(this.parseMaybeUnary(null,
!1),k,q,d,e);b=this.buildBinary(a,h,b,d,g,p);return this.parseExprOp(b,a,h,n,e)}return b};a.buildBinary=function(b,c,a,n,e,m){b=this.startNodeAt(b,c);b.left=a;b.operator=e;b.right=n;return this.finishNode(b,m?"LogicalExpression":"BinaryExpression")};a.parseMaybeUnary=function(b,a){var d=this.start,n=this.startLoc;if(this.type.prefix){var e=this.startNode();var m=this.type===c.types.incDec;e.operator=this.value;e.prefix=!0;this.next();e.argument=this.parseMaybeUnary(null,!0);this.checkExpressionErrors(b,
!0);m?this.checkLVal(e.argument):this.strict&&"delete"===e.operator&&"Identifier"===e.argument.type?this.raiseRecoverable(e.start,"Deleting local variable in strict mode"):a=!0;m=this.finishNode(e,m?"UpdateExpression":"UnaryExpression")}else{m=this.parseExprSubscripts(b);if(this.checkExpressionErrors(b))return m;for(;this.type.postfix&&!this.canInsertSemicolon();)e=this.startNodeAt(d,n),e.operator=this.value,e.prefix=!1,e.argument=m,this.checkLVal(m),this.next(),m=this.finishNode(e,"UpdateExpression")}return!a&&
this.eat(c.types.starstar)?this.buildBinary(d,n,m,this.parseMaybeUnary(null,!1),"**",!1):m};a.parseExprSubscripts=function(b){var c=this.start,a=this.startLoc,n=this.parseExprAtom(b),e="ArrowFunctionExpression"===n.type&&")"!==this.input.slice(this.lastTokStart,this.lastTokEnd);return this.checkExpressionErrors(b)||e?n:this.parseSubscripts(n,c,a)};a.parseSubscripts=function(b,a,h,n){for(var e;;)if(this.eat(c.types.dot))e=this.startNodeAt(a,h),e.object=b,e.property=this.parseIdent(!0),e.computed=!1,
b=this.finishNode(e,"MemberExpression");else if(this.eat(c.types.bracketL))e=this.startNodeAt(a,h),e.object=b,e.property=this.parseExpression(),e.computed=!0,this.expect(c.types.bracketR),b=this.finishNode(e,"MemberExpression");else if(!n&&this.eat(c.types.parenL))e=this.startNodeAt(a,h),e.callee=b,e.arguments=this.parseExprList(c.types.parenR,!1),b=this.finishNode(e,"CallExpression");else if(this.type===c.types.backQuote)e=this.startNodeAt(a,h),e.tag=b,e.quasi=this.parseTemplate(),b=this.finishNode(e,
"TaggedTemplateExpression");else return b};a.parseExprAtom=function(b){var a=this.potentialArrowAt==this.start;switch(this.type){case c.types._super:this.inFunction||this.raise(this.start,"'super' outside of function or class");case c.types._this:return b=this.type===c.types._this?"ThisExpression":"Super",a=this.startNode(),this.next(),this.finishNode(a,b);case c.types.name:b=this.start;var h=this.startLoc,n=this.parseIdent(this.type!==c.types.name);return a&&!this.canInsertSemicolon()&&this.eat(c.types.arrow)?
this.parseArrowExpression(this.startNodeAt(b,h),[n]):n;case c.types.regexp:return b=this.value,a=this.parseLiteral(b.value),a.regex={pattern:b.pattern,flags:b.flags},a;case c.types.num:case c.types.string:return this.parseLiteral(this.value);case c.types._null:case c.types._true:case c.types._false:return a=this.startNode(),a.value=this.type===c.types._null?null:this.type===c.types._true,a.raw=this.type.keyword,this.next(),this.finishNode(a,"Literal");case c.types.parenL:return this.parseParenAndDistinguishExpression(a);
case c.types.bracketL:return a=this.startNode(),this.next(),a.elements=this.parseExprList(c.types.bracketR,!0,!0,b),this.finishNode(a,"ArrayExpression");case c.types.braceL:return this.parseObj(!1,b);case c.types._function:return a=this.startNode(),this.next(),this.parseFunction(a,!1);case c.types._class:return this.parseClass(this.startNode(),!1);case c.types._new:return this.parseNew();case c.types.backQuote:return this.parseTemplate();default:this.unexpected()}};a.parseLiteral=function(b){var a=
this.startNode();a.value=b;a.raw=this.input.slice(this.start,this.end);this.next();return this.finishNode(a,"Literal")};a.parseParenExpression=function(){this.expect(c.types.parenL);var b=this.parseExpression();this.expect(c.types.parenR);return b};a.parseParenAndDistinguishExpression=function(b){var a=this.start,h=this.startLoc;if(6<=this.options.ecmaVersion){this.next();for(var n=this.start,e=this.startLoc,m=[],p=!0,g={shorthandAssign:0,trailingComma:0},k=void 0,q=void 0;this.type!==c.types.parenR;)if(p?
p=!1:this.expect(c.types.comma),this.type===c.types.ellipsis){k=this.start;m.push(this.parseParenItem(this.parseRest()));break}else this.type!==c.types.parenL||q||(q=this.start),m.push(this.parseMaybeAssign(!1,g,this.parseParenItem));var p=this.start,f=this.startLoc;this.expect(c.types.parenR);if(b&&!this.canInsertSemicolon()&&this.eat(c.types.arrow))return this.checkPatternErrors(g,!0),q&&this.unexpected(q),this.parseParenArrowList(a,h,m);m.length||this.unexpected(this.lastTokStart);k&&this.unexpected(k);
this.checkExpressionErrors(g,!0);1<m.length?(b=this.startNodeAt(n,e),b.expressions=m,this.finishNodeAt(b,"SequenceExpression",p,f)):b=m[0]}else b=this.parseParenExpression();return this.options.preserveParens?(a=this.startNodeAt(a,h),a.expression=b,this.finishNode(a,"ParenthesizedExpression")):b};a.parseParenItem=function(b){return b};a.parseParenArrowList=function(b,a,c){return this.parseArrowExpression(this.startNodeAt(b,a),c)};var g=[];a.parseNew=function(){var b=this.startNode(),a=this.parseIdent(!0);
if(6<=this.options.ecmaVersion&&this.eat(c.types.dot))return b.meta=a,b.property=this.parseIdent(!0),"target"!==b.property.name&&this.raiseRecoverable(b.property.start,"The only valid meta property for new is new.target"),this.inFunction||this.raiseRecoverable(b.start,"new.target can only be used in functions"),this.finishNode(b,"MetaProperty");var a=this.start,h=this.startLoc;b.callee=this.parseSubscripts(this.parseExprAtom(),a,h,!0);this.eat(c.types.parenL)?b.arguments=this.parseExprList(c.types.parenR,
!1):b.arguments=g;return this.finishNode(b,"NewExpression")};a.parseTemplateElement=function(){var b=this.startNode();b.value={raw:this.input.slice(this.start,this.end).replace(/\r\n?/g,"\n"),cooked:this.value};this.next();b.tail=this.type===c.types.backQuote;return this.finishNode(b,"TemplateElement")};a.parseTemplate=function(){var b=this.startNode();this.next();b.expressions=[];var a=this.parseTemplateElement();for(b.quasis=[a];!a.tail;)this.expect(c.types.dollarBraceL),b.expressions.push(this.parseExpression()),
this.expect(c.types.braceR),b.quasis.push(a=this.parseTemplateElement());this.next();return this.finishNode(b,"TemplateLiteral")};a.parseObj=function(b,a){var d=this.startNode(),n=!0,e={};d.properties=[];for(this.next();!this.eat(c.types.braceR);){if(n)n=!1;else if(this.expect(c.types.comma),this.afterTrailingComma(c.types.braceR))break;var m=this.startNode(),p=void 0,g=void 0,k=void 0;if(6<=this.options.ecmaVersion){m.method=!1;m.shorthand=!1;if(b||a)g=this.start,k=this.startLoc;b||(p=this.eat(c.types.star))}this.parsePropertyName(m);
this.parsePropertyValue(m,b,p,g,k,a);this.checkPropClash(m,e);d.properties.push(this.finishNode(m,"Property"))}return this.finishNode(d,b?"ObjectPattern":"ObjectExpression")};a.parsePropertyValue=function(b,a,h,n,e,m){this.eat(c.types.colon)?(b.value=a?this.parseMaybeDefault(this.start,this.startLoc):this.parseMaybeAssign(!1,m),b.kind="init"):6<=this.options.ecmaVersion&&this.type===c.types.parenL?(a&&this.unexpected(),b.kind="init",b.method=!0,b.value=this.parseMethod(h)):5<=this.options.ecmaVersion&&
!b.computed&&"Identifier"===b.key.type&&("get"===b.key.name||"set"===b.key.name)&&this.type!=c.types.comma&&this.type!=c.types.braceR?((h||a)&&this.unexpected(),b.kind=b.key.name,this.parsePropertyName(b),b.value=this.parseMethod(!1),b.value.params.length!==("get"===b.kind?0:1)&&(a=b.value.start,"get"===b.kind?this.raiseRecoverable(a,"getter should have no params"):this.raiseRecoverable(a,"setter should have exactly one param")),"set"===b.kind&&"RestElement"===b.value.params[0].type&&this.raiseRecoverable(b.value.params[0].start,
"Setter cannot use rest params")):6<=this.options.ecmaVersion&&!b.computed&&"Identifier"===b.key.type?(b.kind="init",a?((this.keywords.test(b.key.name)||(this.strict?this.reservedWordsStrictBind:this.reservedWords).test(b.key.name)||this.inGenerator&&"yield"==b.key.name)&&this.raiseRecoverable(b.key.start,"Binding "+b.key.name),b.value=this.parseMaybeDefault(n,e,b.key)):this.type===c.types.eq&&m?(m.shorthandAssign||(m.shorthandAssign=this.start),b.value=this.parseMaybeDefault(n,e,b.key)):b.value=
b.key,b.shorthand=!0):this.unexpected()};a.parsePropertyName=function(b){if(6<=this.options.ecmaVersion){if(this.eat(c.types.bracketL))return b.computed=!0,b.key=this.parseMaybeAssign(),this.expect(c.types.bracketR),b.key;b.computed=!1}return b.key=this.type===c.types.num||this.type===c.types.string?this.parseExprAtom():this.parseIdent(!0)};a.initFunction=function(b){b.id=null;6<=this.options.ecmaVersion&&(b.generator=!1,b.expression=!1)};a.parseMethod=function(b){var a=this.startNode(),h=this.inGenerator;
this.inGenerator=b;this.initFunction(a);this.expect(c.types.parenL);a.params=this.parseBindingList(c.types.parenR,!1,!1);6<=this.options.ecmaVersion&&(a.generator=b);this.parseFunctionBody(a,!1);this.inGenerator=h;return this.finishNode(a,"FunctionExpression")};a.parseArrowExpression=function(b,a){var c=this.inGenerator;this.inGenerator=!1;this.initFunction(b);b.params=this.toAssignableList(a,!0);this.parseFunctionBody(b,!0);this.inGenerator=c;return this.finishNode(b,"ArrowFunctionExpression")};
a.parseFunctionBody=function(b,a){var d=a&&this.type!==c.types.braceL;if(d)b.body=this.parseMaybeAssign(),b.expression=!0;else{var n=this.inFunction,e=this.labels;this.inFunction=!0;this.labels=[];b.body=this.parseBlock(!0);b.expression=!1;this.inFunction=n;this.labels=e}this.strict||!d&&b.body.body.length&&this.isUseStrict(b.body.body[0])?(d=this.strict,this.strict=!0,b.id&&this.checkLVal(b.id,!0),this.checkParams(b),this.strict=d):a&&this.checkParams(b)};a.checkParams=function(b){for(var a={},c=
0;c<b.params.length;c++)this.checkLVal(b.params[c],!0,a)};a.parseExprList=function(b,a,h,n){for(var e=[],d=!0;!this.eat(b);){if(d)d=!1;else if(this.expect(c.types.comma),a&&this.afterTrailingComma(b))break;if(h&&this.type===c.types.comma)var p=null;else this.type===c.types.ellipsis?(p=this.parseSpread(n),this.type===c.types.comma&&n&&!n.trailingComma&&(n.trailingComma=this.lastTokStart)):p=this.parseMaybeAssign(!1,n);e.push(p)}return e};a.parseIdent=function(b){var a=this.startNode();b&&"never"==
this.options.allowReserved&&(b=!1);this.type===c.types.name?(!b&&(this.strict?this.reservedWordsStrict:this.reservedWords).test(this.value)&&(6<=this.options.ecmaVersion||-1==this.input.slice(this.start,this.end).indexOf("\\"))&&this.raiseRecoverable(this.start,"The keyword '"+this.value+"' is reserved"),!b&&this.inGenerator&&"yield"===this.value&&this.raiseRecoverable(this.start,"Can not use 'yield' as identifier inside a generator"),a.name=this.value):b&&this.type.keyword?a.name=this.type.keyword:
this.unexpected();this.next();return this.finishNode(a,"Identifier")};a.parseYield=function(){var b=this.startNode();this.next();this.type==c.types.semi||this.canInsertSemicolon()||this.type!=c.types.star&&!this.type.startsExpr?(b.delegate=!1,b.argument=null):(b.delegate=this.eat(c.types.star),b.argument=this.parseMaybeAssign());return this.finishNode(b,"YieldExpression")}},{"./state":10,"./tokentype":14}],2:[function(a,l,f){function c(b,a){for(var e=65536,c=0;c<a.length;c+=2){e+=a[c];if(e>b)return!1;
e+=a[c+1];if(e>=b)return!0}}f.__esModule=!0;f.isIdentifierStart=function(b,a){return 65>b?36===b:91>b?!0:97>b?95===b:123>b?!0:65535>=b?170<=b&&g.test(String.fromCharCode(b)):!1===a?!1:c(b,d)};f.isIdentifierChar=function(a,e){return 48>a?36===a:58>a?!0:65>a?!1:91>a?!0:97>a?95===a:123>a?!0:65535>=a?170<=a&&b.test(String.fromCharCode(a)):!1===e?!1:c(a,d)||c(a,h)};f.reservedWords={3:"abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
5:"class enum extends super const export import",6:"enum",7:"enum",strict:"implements interface let package private protected public static yield",strictBind:"eval arguments"};f.keywords={5:"break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this",6:"break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this const class extends export import super"};
a="\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ad\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var g=new RegExp("["+a+"]"),b=new RegExp("["+a+"\u200c\u200d\u00b7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfc-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]");
a=null;var d=[0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,17,26,6,37,11,29,3,35,5,7,2,4,43,157,99,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,26,45,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,785,52,76,44,33,24,27,35,42,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,287,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,86,25,391,63,32,0,449,56,1288,
921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,881,68,12,0,67,12,16481,1,3071,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,4149,196,1340,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,10591,541],h=[509,0,227,0,150,4,294,9,1368,2,2,1,6,3,
41,2,5,0,166,1,1306,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,52,0,13,2,49,13,10,2,4,9,83,11,168,11,6,9,7,3,57,0,2,6,3,1,3,2,10,0,11,1,3,6,4,4,316,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,423,9,20855,9,135,4,60,6,26,9,1016,45,17,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,3617,6,792618,239]},{}],3:[function(a,l,f){f.__esModule=!0;f.parse=function(a,b){return(new c.Parser(b,a)).parse()};f.parseExpressionAt=function(a,b,d){a=new c.Parser(d,a,b);a.nextToken();
return a.parseExpression()};f.tokenizer=function(a,b){return new c.Parser(b,a)};var c=a("./state");a("./parseutil");a("./statement");a("./lval");a("./expression");a("./location");f.Parser=c.Parser;f.plugins=c.plugins;l=a("./options");f.defaultOptions=l.defaultOptions;l=a("./locutil");f.Position=l.Position;f.SourceLocation=l.SourceLocation;f.getLineInfo=l.getLineInfo;l=a("./node");f.Node=l.Node;l=a("./tokentype");f.TokenType=l.TokenType;f.tokTypes=l.types;l=a("./tokencontext");f.TokContext=l.TokContext;
f.tokContexts=l.types;l=a("./identifier");f.isIdentifierChar=l.isIdentifierChar;f.isIdentifierStart=l.isIdentifierStart;l=a("./tokenize");f.Token=l.Token;a=a("./whitespace");f.isNewLine=a.isNewLine;f.lineBreak=a.lineBreak;f.lineBreakG=a.lineBreakG;f.version="3.1.0"},{"./expression":1,"./identifier":2,"./location":4,"./locutil":5,"./lval":6,"./node":7,"./options":8,"./parseutil":9,"./state":10,"./statement":11,"./tokencontext":12,"./tokenize":13,"./tokentype":14,"./whitespace":16}],4:[function(a,l,
f){l=a("./state");var c=a("./locutil");a=l.Parser.prototype;a.raise=function(a,b){var d=c.getLineInfo(this.input,a);b+=" ("+d.line+":"+d.column+")";var h=new SyntaxError(b);h.pos=a;h.loc=d;h.raisedAt=this.pos;throw h;};a.raiseRecoverable=a.raise;a.curPosition=function(){if(this.options.locations)return new c.Position(this.curLine,this.pos-this.lineStart)}},{"./locutil":5,"./state":10}],5:[function(a,l,f){function c(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function");
}f.__esModule=!0;f.getLineInfo=function(a,c){for(var d=1,e=0;;){g.lineBreakG.lastIndex=e;var m=g.lineBreakG.exec(a);if(m&&m.index<c)++d,e=m.index+m[0].length;else return new b(d,c-e)}};var g=a("./whitespace"),b=function(){function a(b,d){c(this,a);this.line=b;this.column=d}a.prototype.offset=function(b){return new a(this.line,this.column+b)};return a}();f.Position=b;f.SourceLocation=function h(a,b,m){c(this,h);this.start=b;this.end=m;null!==a.sourceFile&&(this.source=a.sourceFile)}},{"./whitespace":16}],
6:[function(a,l,f){var c=a("./tokentype");l=a("./state");var g=a("./util");a=l.Parser.prototype;a.toAssignable=function(a,c){if(6<=this.options.ecmaVersion&&a)switch(a.type){case "Identifier":case "ObjectPattern":case "ArrayPattern":break;case "ObjectExpression":a.type="ObjectPattern";for(var b=0;b<a.properties.length;b++){var d=a.properties[b];"init"!==d.kind&&this.raise(d.key.start,"Object pattern can't contain getter or setter");this.toAssignable(d.value,c)}break;case "ArrayExpression":a.type=
"ArrayPattern";this.toAssignableList(a.elements,c);break;case "AssignmentExpression":if("="===a.operator)a.type="AssignmentPattern",delete a.operator;else{this.raise(a.left.end,"Only '=' operator can be used for specifying default value.");break}case "AssignmentPattern":"YieldExpression"===a.right.type&&this.raise(a.right.start,"Yield expression cannot be a default value");break;case "ParenthesizedExpression":a.expression=this.toAssignable(a.expression,c);break;case "MemberExpression":if(!c)break;
default:this.raise(a.start,"Assigning to rvalue")}return a};a.toAssignableList=function(a,c){var b=a.length;if(b){var d=a[b-1];if(d&&"RestElement"==d.type)--b;else if(d&&"SpreadElement"==d.type){d.type="RestElement";var e=d.argument;this.toAssignable(e,c);"Identifier"!==e.type&&"MemberExpression"!==e.type&&"ArrayPattern"!==e.type&&this.unexpected(e.start);--b}c&&"RestElement"===d.type&&"Identifier"!==d.argument.type&&this.unexpected(d.argument.start)}for(d=0;d<b;d++)(e=a[d])&&this.toAssignable(e,
c);return a};a.parseSpread=function(a){var b=this.startNode();this.next();b.argument=this.parseMaybeAssign(a);return this.finishNode(b,"SpreadElement")};a.parseRest=function(a){var b=this.startNode();this.next();b.argument=a?this.type===c.types.name?this.parseIdent():this.unexpected():this.type===c.types.name||this.type===c.types.bracketL?this.parseBindingAtom():this.unexpected();return this.finishNode(b,"RestElement")};a.parseBindingAtom=function(){if(6>this.options.ecmaVersion)return this.parseIdent();
switch(this.type){case c.types.name:return this.parseIdent();case c.types.bracketL:var a=this.startNode();this.next();a.elements=this.parseBindingList(c.types.bracketR,!0,!0);return this.finishNode(a,"ArrayPattern");case c.types.braceL:return this.parseObj(!0);default:this.unexpected()}};a.parseBindingList=function(a,d,h,n){for(var b=[],m=!0;!this.eat(a);)if(m?m=!1:this.expect(c.types.comma),d&&this.type===c.types.comma)b.push(null);else if(h&&this.afterTrailingComma(a))break;else if(this.type===
c.types.ellipsis){d=this.parseRest(n);this.parseBindingListItem(d);b.push(d);this.type===c.types.comma&&this.raise(this.start,"Comma is not permitted after the rest element");this.expect(a);break}else{var p=this.parseMaybeDefault(this.start,this.startLoc);this.parseBindingListItem(p);b.push(p)}return b};a.parseBindingListItem=function(a){return a};a.parseMaybeDefault=function(a,d,h){h=h||this.parseBindingAtom();if(6>this.options.ecmaVersion||!this.eat(c.types.eq))return h;a=this.startNodeAt(a,d);
a.left=h;a.right=this.parseMaybeAssign();return this.finishNode(a,"AssignmentPattern")};a.checkLVal=function(a,c,h){switch(a.type){case "Identifier":this.strict&&this.reservedWordsStrictBind.test(a.name)&&this.raiseRecoverable(a.start,(c?"Binding ":"Assigning to ")+a.name+" in strict mode");h&&(g.has(h,a.name)&&this.raiseRecoverable(a.start,"Argument name clash"),h[a.name]=!0);break;case "MemberExpression":c&&this.raiseRecoverable(a.start,(c?"Binding":"Assigning to")+" member expression");break;case "ObjectPattern":for(var b=
0;b<a.properties.length;b++)this.checkLVal(a.properties[b].value,c,h);break;case "ArrayPattern":for(b=0;b<a.elements.length;b++){var e=a.elements[b];e&&this.checkLVal(e,c,h)}break;case "AssignmentPattern":this.checkLVal(a.left,c,h);break;case "RestElement":this.checkLVal(a.argument,c,h);break;case "ParenthesizedExpression":this.checkLVal(a.expression,c,h);break;default:this.raise(a.start,(c?"Binding":"Assigning to")+" rvalue")}}},{"./state":10,"./tokentype":14,"./util":15}],7:[function(a,l,f){function c(a,
b,c,e){a.type=b;a.end=c;this.options.locations&&(a.loc.end=e);this.options.ranges&&(a.range[1]=c);return a}f.__esModule=!0;l=a("./state");var g=a("./locutil"),b=function h(a,b,c){if(!(this instanceof h))throw new TypeError("Cannot call a class as a function");this.type="";this.start=b;this.end=0;a.options.locations&&(this.loc=new g.SourceLocation(a,c));a.options.directSourceFile&&(this.sourceFile=a.options.directSourceFile);a.options.ranges&&(this.range=[b,0])};f.Node=b;a=l.Parser.prototype;a.startNode=
function(){return new b(this,this.start,this.startLoc)};a.startNodeAt=function(a,c){return new b(this,a,c)};a.finishNode=function(a,b){return c.call(this,a,b,this.lastTokEnd,this.lastTokEndLoc)};a.finishNodeAt=function(a,b,e,m){return c.call(this,a,b,e,m)}},{"./locutil":5,"./state":10}],8:[function(a,l,f){function c(a,c){return function(e,m,d,h,k,q){e={type:e?"Block":"Line",value:m,start:d,end:h};a.locations&&(e.loc=new b.SourceLocation(this,k,q));a.ranges&&(e.range=[d,h]);c.push(e)}}f.__esModule=
!0;f.getOptions=function(a){var b={},e;for(e in d)b[e]=a&&g.has(a,e)?a[e]:d[e];null==b.allowReserved&&(b.allowReserved=5>b.ecmaVersion);g.isArray(b.onToken)&&function(){var a=b.onToken;b.onToken=function(b){return a.push(b)}}();g.isArray(b.onComment)&&(b.onComment=c(b,b.onComment));return b};var g=a("./util"),b=a("./locutil"),d={ecmaVersion:6,sourceType:"script",onInsertedSemicolon:null,onTrailingComma:null,allowReserved:null,allowReturnOutsideFunction:!1,allowImportExportEverywhere:!1,allowHashBang:!1,
locations:!1,onToken:null,onComment:null,ranges:!1,program:null,sourceFile:null,directSourceFile:null,preserveParens:!1,plugins:{}};f.defaultOptions=d},{"./locutil":5,"./util":15}],9:[function(a,l,f){var c=a("./tokentype");l=a("./state");var g=a("./whitespace");a=l.Parser.prototype;a.isUseStrict=function(a){return 5<=this.options.ecmaVersion&&"ExpressionStatement"===a.type&&"Literal"===a.expression.type&&"use strict"===a.expression.raw.slice(1,-1)};a.eat=function(a){return this.type===a?(this.next(),
!0):!1};a.isContextual=function(a){return this.type===c.types.name&&this.value===a};a.eatContextual=function(a){return this.value===a&&this.eat(c.types.name)};a.expectContextual=function(a){this.eatContextual(a)||this.unexpected()};a.canInsertSemicolon=function(){return this.type===c.types.eof||this.type===c.types.braceR||g.lineBreak.test(this.input.slice(this.lastTokEnd,this.start))};a.insertSemicolon=function(){if(this.canInsertSemicolon()){if(this.options.onInsertedSemicolon)this.options.onInsertedSemicolon(this.lastTokEnd,
this.lastTokEndLoc);return!0}};a.semicolon=function(){this.eat(c.types.semi)||this.insertSemicolon()||this.unexpected()};a.afterTrailingComma=function(a){if(this.type==a){if(this.options.onTrailingComma)this.options.onTrailingComma(this.lastTokStart,this.lastTokStartLoc);this.next();return!0}};a.expect=function(a){this.eat(a)||this.unexpected()};a.unexpected=function(a){this.raise(null!=a?a:this.start,"Unexpected token")};a.checkPatternErrors=function(a,c){var b=a&&a.trailingComma;if(!c)return!!b;
b&&this.raise(b,"Comma is not permitted after the rest element")};a.checkExpressionErrors=function(a,c){var b=a&&a.shorthandAssign;if(!c)return!!b;b&&this.raise(b,"Shorthand property assignments are valid only in destructuring patterns")}},{"./state":10,"./tokentype":14,"./whitespace":16}],10:[function(a,l,f){function c(a){return new RegExp("^("+a.replace(/ /g,"|")+")$")}f.__esModule=!0;var g=a("./identifier"),b=a("./tokentype"),d=a("./whitespace"),h=a("./options"),n={};f.plugins=n;a=function(){function a(e,
p,f){if(!(this instanceof a))throw new TypeError("Cannot call a class as a function");this.options=e=h.getOptions(e);this.sourceFile=e.sourceFile;this.keywords=c(g.keywords[6<=e.ecmaVersion?6:5]);var k=e.allowReserved?"":g.reservedWords[e.ecmaVersion]+("module"==e.sourceType?" await":"");this.reservedWords=c(k);k=(k?k+" ":"")+g.reservedWords.strict;this.reservedWordsStrict=c(k);this.reservedWordsStrictBind=c(k+" "+g.reservedWords.strictBind);this.input=String(p);this.containsEsc=!1;this.loadPlugins(e.plugins);
f?(this.pos=f,this.lineStart=Math.max(0,this.input.lastIndexOf("\n",f)),this.curLine=this.input.slice(0,this.lineStart).split(d.lineBreak).length):(this.pos=this.lineStart=0,this.curLine=1);this.type=b.types.eof;this.value=null;this.start=this.end=this.pos;this.startLoc=this.endLoc=this.curPosition();this.lastTokEndLoc=this.lastTokStartLoc=null;this.lastTokStart=this.lastTokEnd=this.pos;this.context=this.initialContext();this.exprAllowed=!0;this.strict=this.inModule="module"===e.sourceType;this.potentialArrowAt=
-1;this.inFunction=this.inGenerator=!1;this.labels=[];0===this.pos&&e.allowHashBang&&"#!"===this.input.slice(0,2)&&this.skipLineComment(2)}a.prototype.isKeyword=function(a){return this.keywords.test(a)};a.prototype.isReservedWord=function(a){return this.reservedWords.test(a)};a.prototype.extend=function(a,b){this[a]=b(this[a])};a.prototype.loadPlugins=function(a){for(var b in a){var c=n[b];if(!c)throw Error("Plugin '"+b+"' not found");c(this,a[b])}};a.prototype.parse=function(){var a=this.options.program||
this.startNode();this.nextToken();return this.parseTopLevel(a)};return a}();f.Parser=a},{"./identifier":2,"./options":8,"./tokentype":14,"./whitespace":16}],11:[function(a,l,f){var c=a("./tokentype");l=a("./state");var g=a("./whitespace"),b=a("./identifier");a=l.Parser.prototype;a.parseTopLevel=function(a){var b=!0;a.body||(a.body=[]);for(;this.type!==c.types.eof;){var e=this.parseStatement(!0,!0);a.body.push(e);b&&(this.isUseStrict(e)&&this.setStrict(!0),b=!1)}this.next();6<=this.options.ecmaVersion&&
(a.sourceType=this.options.sourceType);return this.finishNode(a,"Program")};var d={kind:"loop"},h={kind:"switch"};a.isLet=function(){if(this.type!==c.types.name||6>this.options.ecmaVersion||"let"!=this.value)return!1;g.skipWhiteSpace.lastIndex=this.pos;var a=g.skipWhiteSpace.exec(this.input),a=this.pos+a[0].length,d=this.input.charCodeAt(a);if(91===d||123==d)return!0;if(b.isIdentifierStart(d,!0)){for(d=a+1;b.isIdentifierChar(this.input.charCodeAt(d,!0));++d);a=this.input.slice(a,d);if(!this.isKeyword(a))return!0}return!1};
a.parseStatement=function(a,b){var e=this.type,d=this.startNode(),k=void 0;this.isLet()&&(e=c.types._var,k="let");switch(e){case c.types._break:case c.types._continue:return this.parseBreakContinueStatement(d,e.keyword);case c.types._debugger:return this.parseDebuggerStatement(d);case c.types._do:return this.parseDoStatement(d);case c.types._for:return this.parseForStatement(d);case c.types._function:return!a&&6<=this.options.ecmaVersion&&this.unexpected(),this.parseFunctionStatement(d);case c.types._class:return a||
this.unexpected(),this.parseClass(d,!0);case c.types._if:return this.parseIfStatement(d);case c.types._return:return this.parseReturnStatement(d);case c.types._switch:return this.parseSwitchStatement(d);case c.types._throw:return this.parseThrowStatement(d);case c.types._try:return this.parseTryStatement(d);case c.types._const:case c.types._var:return k=k||this.value,a||"var"==k||this.unexpected(),this.parseVarStatement(d,k);case c.types._while:return this.parseWhileStatement(d);case c.types._with:return this.parseWithStatement(d);
case c.types.braceL:return this.parseBlock();case c.types.semi:return this.parseEmptyStatement(d);case c.types._export:case c.types._import:return this.options.allowImportExportEverywhere||(b||this.raise(this.start,"'import' and 'export' may only appear at the top level"),this.inModule||this.raise(this.start,"'import' and 'export' may appear only with 'sourceType: module'")),e===c.types._import?this.parseImport(d):this.parseExport(d);default:var k=this.value,m=this.parseExpression();return e===c.types.name&&
"Identifier"===m.type&&this.eat(c.types.colon)?this.parseLabeledStatement(d,k,m):this.parseExpressionStatement(d,m)}};a.parseBreakContinueStatement=function(a,b){var e="break"==b;this.next();this.eat(c.types.semi)||this.insertSemicolon()?a.label=null:this.type!==c.types.name?this.unexpected():(a.label=this.parseIdent(),this.semicolon());for(var d=0;d<this.labels.length;++d){var k=this.labels[d];if(null==a.label||k.name===a.label.name){if(null!=k.kind&&(e||"loop"===k.kind))break;if(a.label&&e)break}}d===
this.labels.length&&this.raise(a.start,"Unsyntactic "+b);return this.finishNode(a,e?"BreakStatement":"ContinueStatement")};a.parseDebuggerStatement=function(a){this.next();this.semicolon();return this.finishNode(a,"DebuggerStatement")};a.parseDoStatement=function(a){this.next();this.labels.push(d);a.body=this.parseStatement(!1);this.labels.pop();this.expect(c.types._while);a.test=this.parseParenExpression();6<=this.options.ecmaVersion?this.eat(c.types.semi):this.semicolon();return this.finishNode(a,
"DoWhileStatement")};a.parseForStatement=function(a){this.next();this.labels.push(d);this.expect(c.types.parenL);if(this.type===c.types.semi)return this.parseFor(a,null);var b=this.isLet();if(this.type===c.types._var||this.type===c.types._const||b){var e=this.startNode(),b=b?"let":this.value;this.next();this.parseVar(e,!0,b);this.finishNode(e,"VariableDeclaration");return!(this.type===c.types._in||6<=this.options.ecmaVersion&&this.isContextual("of"))||1!==e.declarations.length||"var"!==b&&e.declarations[0].init?
this.parseFor(a,e):this.parseForIn(a,e)}e={shorthandAssign:0,trailingComma:0};b=this.parseExpression(!0,e);if(this.type===c.types._in||6<=this.options.ecmaVersion&&this.isContextual("of"))return this.checkPatternErrors(e,!0),this.toAssignable(b),this.checkLVal(b),this.parseForIn(a,b);this.checkExpressionErrors(e,!0);return this.parseFor(a,b)};a.parseFunctionStatement=function(a){this.next();return this.parseFunction(a,!0)};a.parseIfStatement=function(a){this.next();a.test=this.parseParenExpression();
a.consequent=this.parseStatement(!1);a.alternate=this.eat(c.types._else)?this.parseStatement(!1):null;return this.finishNode(a,"IfStatement")};a.parseReturnStatement=function(a){this.inFunction||this.options.allowReturnOutsideFunction||this.raise(this.start,"'return' outside of function");this.next();this.eat(c.types.semi)||this.insertSemicolon()?a.argument=null:(a.argument=this.parseExpression(),this.semicolon());return this.finishNode(a,"ReturnStatement")};a.parseSwitchStatement=function(a){this.next();
a.discriminant=this.parseParenExpression();a.cases=[];this.expect(c.types.braceL);this.labels.push(h);for(var b,e=!1;this.type!=c.types.braceR;)if(this.type===c.types._case||this.type===c.types._default){var d=this.type===c.types._case;b&&this.finishNode(b,"SwitchCase");a.cases.push(b=this.startNode());b.consequent=[];this.next();d?b.test=this.parseExpression():(e&&this.raiseRecoverable(this.lastTokStart,"Multiple default clauses"),e=!0,b.test=null);this.expect(c.types.colon)}else b||this.unexpected(),
b.consequent.push(this.parseStatement(!0));b&&this.finishNode(b,"SwitchCase");this.next();this.labels.pop();return this.finishNode(a,"SwitchStatement")};a.parseThrowStatement=function(a){this.next();g.lineBreak.test(this.input.slice(this.lastTokEnd,this.start))&&this.raise(this.lastTokEnd,"Illegal newline after throw");a.argument=this.parseExpression();this.semicolon();return this.finishNode(a,"ThrowStatement")};var n=[];a.parseTryStatement=function(a){this.next();a.block=this.parseBlock();a.handler=
null;if(this.type===c.types._catch){var b=this.startNode();this.next();this.expect(c.types.parenL);b.param=this.parseBindingAtom();this.checkLVal(b.param,!0);this.expect(c.types.parenR);b.body=this.parseBlock();a.handler=this.finishNode(b,"CatchClause")}a.finalizer=this.eat(c.types._finally)?this.parseBlock():null;a.handler||a.finalizer||this.raise(a.start,"Missing catch or finally clause");return this.finishNode(a,"TryStatement")};a.parseVarStatement=function(a,b){this.next();this.parseVar(a,!1,
b);this.semicolon();return this.finishNode(a,"VariableDeclaration")};a.parseWhileStatement=function(a){this.next();a.test=this.parseParenExpression();this.labels.push(d);a.body=this.parseStatement(!1);this.labels.pop();return this.finishNode(a,"WhileStatement")};a.parseWithStatement=function(a){this.strict&&this.raise(this.start,"'with' in strict mode");this.next();a.object=this.parseParenExpression();a.body=this.parseStatement(!1);return this.finishNode(a,"WithStatement")};a.parseEmptyStatement=
function(a){this.next();return this.finishNode(a,"EmptyStatement")};a.parseLabeledStatement=function(a,b,d){for(var e=0;e<this.labels.length;++e)this.labels[e].name===b&&this.raise(d.start,"Label '"+b+"' is already declared");for(var k=this.type.isLoop?"loop":this.type===c.types._switch?"switch":null,e=this.labels.length-1;0<=e;e--){var q=this.labels[e];if(q.statementStart==a.start)q.statementStart=this.start,q.kind=k;else break}this.labels.push({name:b,kind:k,statementStart:this.start});a.body=this.parseStatement(!0);
this.labels.pop();a.label=d;return this.finishNode(a,"LabeledStatement")};a.parseExpressionStatement=function(a,b){a.expression=b;this.semicolon();return this.finishNode(a,"ExpressionStatement")};a.parseBlock=function(a){var b=this.startNode(),e=!0,d=void 0;b.body=[];for(this.expect(c.types.braceL);!this.eat(c.types.braceR);){var k=this.parseStatement(!0);b.body.push(k);e&&a&&this.isUseStrict(k)&&(d=this.strict,this.setStrict(this.strict=!0));e=!1}!1===d&&this.setStrict(!1);return this.finishNode(b,
"BlockStatement")};a.parseFor=function(a,b){a.init=b;this.expect(c.types.semi);a.test=this.type===c.types.semi?null:this.parseExpression();this.expect(c.types.semi);a.update=this.type===c.types.parenR?null:this.parseExpression();this.expect(c.types.parenR);a.body=this.parseStatement(!1);this.labels.pop();return this.finishNode(a,"ForStatement")};a.parseForIn=function(a,b){var e=this.type===c.types._in?"ForInStatement":"ForOfStatement";this.next();a.left=b;a.right=this.parseExpression();this.expect(c.types.parenR);
a.body=this.parseStatement(!1);this.labels.pop();return this.finishNode(a,e)};a.parseVar=function(a,b,d){a.declarations=[];for(a.kind=d;;){var e=this.startNode();this.parseVarId(e);this.eat(c.types.eq)?e.init=this.parseMaybeAssign(b):"const"!==d||this.type===c.types._in||6<=this.options.ecmaVersion&&this.isContextual("of")?"Identifier"==e.id.type||b&&(this.type===c.types._in||this.isContextual("of"))?e.init=null:this.raise(this.lastTokEnd,"Complex binding patterns require an initialization value"):
this.unexpected();a.declarations.push(this.finishNode(e,"VariableDeclarator"));if(!this.eat(c.types.comma))break}return a};a.parseVarId=function(a){a.id=this.parseBindingAtom();this.checkLVal(a.id,!0)};a.parseFunction=function(a,b,d){this.initFunction(a);6<=this.options.ecmaVersion&&(a.generator=this.eat(c.types.star));var e=this.inGenerator;this.inGenerator=a.generator;if(b||this.type===c.types.name)a.id=this.parseIdent();this.parseFunctionParams(a);this.parseFunctionBody(a,d);this.inGenerator=e;
return this.finishNode(a,b?"FunctionDeclaration":"FunctionExpression")};a.parseFunctionParams=function(a){this.expect(c.types.parenL);a.params=this.parseBindingList(c.types.parenR,!1,!1,!0)};a.parseClass=function(a,b){this.next();this.parseClassId(a,b);this.parseClassSuper(a);var e=this.startNode(),d=!1;e.body=[];for(this.expect(c.types.braceL);!this.eat(c.types.braceR);)if(!this.eat(c.types.semi)){var k=this.startNode(),q=this.eat(c.types.star),h=this.type===c.types.name&&"static"===this.value;this.parsePropertyName(k);
k["static"]=h&&this.type!==c.types.parenL;k["static"]&&(q&&this.unexpected(),q=this.eat(c.types.star),this.parsePropertyName(k));k.kind="method";h=!1;if(!k.computed){var f=k.key;q||"Identifier"!==f.type||this.type===c.types.parenL||"get"!==f.name&&"set"!==f.name||(h=!0,k.kind=f.name,f=this.parsePropertyName(k));!k["static"]&&("Identifier"===f.type&&"constructor"===f.name||"Literal"===f.type&&"constructor"===f.value)&&(d&&this.raise(f.start,"Duplicate constructor in the same class"),h&&this.raise(f.start,
"Constructor can't have get/set modifier"),q&&this.raise(f.start,"Constructor can't be a generator"),k.kind="constructor",d=!0)}this.parseClassMethod(e,k,q);h&&(k.value.params.length!==("get"===k.kind?0:1)&&(q=k.value.start,"get"===k.kind?this.raiseRecoverable(q,"getter should have no params"):this.raiseRecoverable(q,"setter should have exactly one param")),"set"===k.kind&&"RestElement"===k.value.params[0].type&&this.raise(k.value.params[0].start,"Setter cannot use rest params"))}a.body=this.finishNode(e,
"ClassBody");return this.finishNode(a,b?"ClassDeclaration":"ClassExpression")};a.parseClassMethod=function(a,b,c){b.value=this.parseMethod(c);a.body.push(this.finishNode(b,"MethodDefinition"))};a.parseClassId=function(a,b){a.id=this.type===c.types.name?this.parseIdent():b?this.unexpected():null};a.parseClassSuper=function(a){a.superClass=this.eat(c.types._extends)?this.parseExprSubscripts():null};a.parseExport=function(a){this.next();if(this.eat(c.types.star))return this.expectContextual("from"),
a.source=this.type===c.types.string?this.parseExprAtom():this.unexpected(),this.semicolon(),this.finishNode(a,"ExportAllDeclaration");if(this.eat(c.types._default)){var b=this.type==c.types.parenL,e=this.parseMaybeAssign(),d=!0;b||"FunctionExpression"!=e.type&&"ClassExpression"!=e.type||(d=!1,e.id&&(e.type="FunctionExpression"==e.type?"FunctionDeclaration":"ClassDeclaration"));a.declaration=e;d&&this.semicolon();return this.finishNode(a,"ExportDefaultDeclaration")}if(this.shouldParseExportStatement())a.declaration=
this.parseStatement(!0),a.specifiers=[],a.source=null;else{a.declaration=null;a.specifiers=this.parseExportSpecifiers();if(this.eatContextual("from"))a.source=this.type===c.types.string?this.parseExprAtom():this.unexpected();else{for(b=0;b<a.specifiers.length;b++)(this.keywords.test(a.specifiers[b].local.name)||this.reservedWords.test(a.specifiers[b].local.name))&&this.unexpected(a.specifiers[b].local.start);a.source=null}this.semicolon()}return this.finishNode(a,"ExportNamedDeclaration")};a.shouldParseExportStatement=
function(){return this.type.keyword||this.isLet()};a.parseExportSpecifiers=function(){var a=[],b=!0;for(this.expect(c.types.braceL);!this.eat(c.types.braceR);){if(b)b=!1;else if(this.expect(c.types.comma),this.afterTrailingComma(c.types.braceR))break;var d=this.startNode();d.local=this.parseIdent(this.type===c.types._default);d.exported=this.eatContextual("as")?this.parseIdent(!0):d.local;a.push(this.finishNode(d,"ExportSpecifier"))}return a};a.parseImport=function(a){this.next();this.type===c.types.string?
(a.specifiers=n,a.source=this.parseExprAtom()):(a.specifiers=this.parseImportSpecifiers(),this.expectContextual("from"),a.source=this.type===c.types.string?this.parseExprAtom():this.unexpected());this.semicolon();return this.finishNode(a,"ImportDeclaration")};a.parseImportSpecifiers=function(){var a=[],b=!0;if(this.type===c.types.name){var d=this.startNode();d.local=this.parseIdent();this.checkLVal(d.local,!0);a.push(this.finishNode(d,"ImportDefaultSpecifier"));if(!this.eat(c.types.comma))return a}if(this.type===
c.types.star)return d=this.startNode(),this.next(),this.expectContextual("as"),d.local=this.parseIdent(),this.checkLVal(d.local,!0),a.push(this.finishNode(d,"ImportNamespaceSpecifier")),a;for(this.expect(c.types.braceL);!this.eat(c.types.braceR);){if(b)b=!1;else if(this.expect(c.types.comma),this.afterTrailingComma(c.types.braceR))break;d=this.startNode();d.imported=this.parseIdent(!0);this.eatContextual("as")?d.local=this.parseIdent():(d.local=d.imported,this.isKeyword(d.local.name)&&this.unexpected(d.local.start),
this.reservedWordsStrict.test(d.local.name)&&this.raise(d.local.start,"The keyword '"+d.local.name+"' is reserved"));this.checkLVal(d.local,!0);a.push(this.finishNode(d,"ImportSpecifier"))}return a}},{"./identifier":2,"./state":10,"./tokentype":14,"./whitespace":16}],12:[function(a,l,f){f.__esModule=!0;l=a("./state");var c=a("./tokentype"),g=a("./whitespace");a=function h(a,b,c,f){if(!(this instanceof h))throw new TypeError("Cannot call a class as a function");this.token=a;this.isExpr=!!b;this.preserveSpace=
!!c;this.override=f};f.TokContext=a;var b={b_stat:new a("{",!1),b_expr:new a("{",!0),b_tmpl:new a("${",!0),p_stat:new a("(",!1),p_expr:new a("(",!0),q_tmpl:new a("`",!0,!0,function(a){return a.readTmplToken()}),f_expr:new a("function",!0)};f.types=b;f=l.Parser.prototype;f.initialContext=function(){return[b.b_stat]};f.braceIsBlock=function(a){if(a===c.types.colon){var f=this.curContext();if(f===b.b_stat||f===b.b_expr)return!f.isExpr}return a===c.types._return?g.lineBreak.test(this.input.slice(this.lastTokEnd,
this.start)):a===c.types._else||a===c.types.semi||a===c.types.eof||a===c.types.parenR?!0:a==c.types.braceL?this.curContext()===b.b_stat:!this.exprAllowed};f.updateContext=function(a){var b,e=this.type;e.keyword&&a==c.types.dot?this.exprAllowed=!1:(b=e.updateContext)?b.call(this,a):this.exprAllowed=e.beforeExpr};c.types.parenR.updateContext=c.types.braceR.updateContext=function(){if(1==this.context.length)this.exprAllowed=!0;else{var a=this.context.pop();a===b.b_stat&&this.curContext()===b.f_expr?
(this.context.pop(),this.exprAllowed=!1):this.exprAllowed=a===b.b_tmpl?!0:!a.isExpr}};c.types.braceL.updateContext=function(a){this.context.push(this.braceIsBlock(a)?b.b_stat:b.b_expr);this.exprAllowed=!0};c.types.dollarBraceL.updateContext=function(){this.context.push(b.b_tmpl);this.exprAllowed=!0};c.types.parenL.updateContext=function(a){this.context.push(a===c.types._if||a===c.types._for||a===c.types._with||a===c.types._while?b.p_stat:b.p_expr);this.exprAllowed=!0};c.types.incDec.updateContext=
function(){};c.types._function.updateContext=function(a){!a.beforeExpr||a===c.types.semi||a===c.types._else||a===c.types.colon&&this.curContext()===b.b_stat||this.context.push(b.f_expr);this.exprAllowed=!1};c.types.backQuote.updateContext=function(){this.curContext()===b.q_tmpl?this.context.pop():this.context.push(b.q_tmpl);this.exprAllowed=!1}},{"./state":10,"./tokentype":14,"./whitespace":16}],13:[function(a,l,f){function c(a,b,c,d){try{return new RegExp(a,b)}catch(t){if(void 0!==c)throw t instanceof
SyntaxError&&d.raise(c,"Error parsing regular expression: "+t.message),t;}}function g(a){if(65535>=a)return String.fromCharCode(a);a-=65536;return String.fromCharCode((a>>10)+55296,(a&1023)+56320)}f.__esModule=!0;var b=a("./identifier"),d=a("./tokentype");l=a("./state");var h=a("./locutil"),n=a("./whitespace"),e=function k(a){if(!(this instanceof k))throw new TypeError("Cannot call a class as a function");this.type=a.type;this.value=a.value;this.start=a.start;this.end=a.end;a.options.locations&&(this.loc=
new h.SourceLocation(a,a.startLoc,a.endLoc));a.options.ranges&&(this.range=[a.start,a.end])};f.Token=e;a=l.Parser.prototype;var m="object"==typeof Packages&&"[object JavaPackage]"==Object.prototype.toString.call(Packages);a.next=function(){if(this.options.onToken)this.options.onToken(new e(this));this.lastTokEnd=this.end;this.lastTokStart=this.start;this.lastTokEndLoc=this.endLoc;this.lastTokStartLoc=this.startLoc;this.nextToken()};a.getToken=function(){this.next();return new e(this)};"undefined"!==
typeof Symbol&&(a[Symbol.iterator]=function(){var a=this;return{next:function(){var b=a.getToken();return{done:b.type===d.types.eof,value:b}}}});a.setStrict=function(a){this.strict=a;if(this.type===d.types.num||this.type===d.types.string){this.pos=this.start;if(this.options.locations)for(;this.pos<this.lineStart;)this.lineStart=this.input.lastIndexOf("\n",this.lineStart-2)+1,--this.curLine;this.nextToken()}};a.curContext=function(){return this.context[this.context.length-1]};a.nextToken=function(){var a=
this.curContext();a&&a.preserveSpace||this.skipSpace();this.start=this.pos;this.options.locations&&(this.startLoc=this.curPosition());if(this.pos>=this.input.length)return this.finishToken(d.types.eof);if(a.override)return a.override(this);this.readToken(this.fullCharCodeAtPos())};a.readToken=function(a){return b.isIdentifierStart(a,6<=this.options.ecmaVersion)||92===a?this.readWord():this.getTokenFromCode(a)};a.fullCharCodeAtPos=function(){var a=this.input.charCodeAt(this.pos);if(55295>=a||57344<=
a)return a;var b=this.input.charCodeAt(this.pos+1);return(a<<10)+b-56613888};a.skipBlockComment=function(){var a=this.options.onComment&&this.curPosition(),b=this.pos,c=this.input.indexOf("*/",this.pos+=2);-1===c&&this.raise(this.pos-2,"Unterminated comment");this.pos=c+2;if(this.options.locations){n.lineBreakG.lastIndex=b;for(var d=void 0;(d=n.lineBreakG.exec(this.input))&&d.index<this.pos;)++this.curLine,this.lineStart=d.index+d[0].length}if(this.options.onComment)this.options.onComment(!0,this.input.slice(b+
2,c),b,this.pos,a,this.curPosition())};a.skipLineComment=function(a){for(var b=this.pos,c=this.options.onComment&&this.curPosition(),d=this.input.charCodeAt(this.pos+=a);this.pos<this.input.length&&10!==d&&13!==d&&8232!==d&&8233!==d;)++this.pos,d=this.input.charCodeAt(this.pos);if(this.options.onComment)this.options.onComment(!1,this.input.slice(b+a,this.pos),b,this.pos,c,this.curPosition())};a.skipSpace=function(){a:for(;this.pos<this.input.length;){var a=this.input.charCodeAt(this.pos);switch(a){case 32:case 160:++this.pos;
break;case 13:10===this.input.charCodeAt(this.pos+1)&&++this.pos;case 10:case 8232:case 8233:++this.pos;this.options.locations&&(++this.curLine,this.lineStart=this.pos);break;case 47:switch(this.input.charCodeAt(this.pos+1)){case 42:this.skipBlockComment();break;case 47:this.skipLineComment(2);break;default:break a}break;default:if(8<a&&14>a||5760<=a&&n.nonASCIIwhitespace.test(String.fromCharCode(a)))++this.pos;else break a}}};a.finishToken=function(a,b){this.end=this.pos;this.options.locations&&
(this.endLoc=this.curPosition());var c=this.type;this.type=a;this.value=b;this.updateContext(c)};a.readToken_dot=function(){var a=this.input.charCodeAt(this.pos+1);if(48<=a&&57>=a)return this.readNumber(!0);var b=this.input.charCodeAt(this.pos+2);if(6<=this.options.ecmaVersion&&46===a&&46===b)return this.pos+=3,this.finishToken(d.types.ellipsis);++this.pos;return this.finishToken(d.types.dot)};a.readToken_slash=function(){var a=this.input.charCodeAt(this.pos+1);return this.exprAllowed?(++this.pos,
this.readRegexp()):61===a?this.finishOp(d.types.assign,2):this.finishOp(d.types.slash,1)};a.readToken_mult_modulo_exp=function(a){var b=this.input.charCodeAt(this.pos+1),c=1;a=42===a?d.types.star:d.types.modulo;7<=this.options.ecmaVersion&&42===b&&(++c,a=d.types.starstar,b=this.input.charCodeAt(this.pos+2));return 61===b?this.finishOp(d.types.assign,c+1):this.finishOp(a,c)};a.readToken_pipe_amp=function(a){var b=this.input.charCodeAt(this.pos+1);return b===a?this.finishOp(124===a?d.types.logicalOR:
d.types.logicalAND,2):61===b?this.finishOp(d.types.assign,2):this.finishOp(124===a?d.types.bitwiseOR:d.types.bitwiseAND,1)};a.readToken_caret=function(){return 61===this.input.charCodeAt(this.pos+1)?this.finishOp(d.types.assign,2):this.finishOp(d.types.bitwiseXOR,1)};a.readToken_plus_min=function(a){var b=this.input.charCodeAt(this.pos+1);return b===a?45==b&&62==this.input.charCodeAt(this.pos+2)&&n.lineBreak.test(this.input.slice(this.lastTokEnd,this.pos))?(this.skipLineComment(3),this.skipSpace(),
this.nextToken()):this.finishOp(d.types.incDec,2):61===b?this.finishOp(d.types.assign,2):this.finishOp(d.types.plusMin,1)};a.readToken_lt_gt=function(a){var b=this.input.charCodeAt(this.pos+1),c=1;if(b===a)return c=62===a&&62===this.input.charCodeAt(this.pos+2)?3:2,61===this.input.charCodeAt(this.pos+c)?this.finishOp(d.types.assign,c+1):this.finishOp(d.types.bitShift,c);if(33==b&&60==a&&45==this.input.charCodeAt(this.pos+2)&&45==this.input.charCodeAt(this.pos+3))return this.inModule&&this.unexpected(),
this.skipLineComment(4),this.skipSpace(),this.nextToken();61===b&&(c=2);return this.finishOp(d.types.relational,c)};a.readToken_eq_excl=function(a){var b=this.input.charCodeAt(this.pos+1);return 61===b?this.finishOp(d.types.equality,61===this.input.charCodeAt(this.pos+2)?3:2):61===a&&62===b&&6<=this.options.ecmaVersion?(this.pos+=2,this.finishToken(d.types.arrow)):this.finishOp(61===a?d.types.eq:d.types.prefix,1)};a.getTokenFromCode=function(a){switch(a){case 46:return this.readToken_dot();case 40:return++this.pos,
this.finishToken(d.types.parenL);case 41:return++this.pos,this.finishToken(d.types.parenR);case 59:return++this.pos,this.finishToken(d.types.semi);case 44:return++this.pos,this.finishToken(d.types.comma);case 91:return++this.pos,this.finishToken(d.types.bracketL);case 93:return++this.pos,this.finishToken(d.types.bracketR);case 123:return++this.pos,this.finishToken(d.types.braceL);case 125:return++this.pos,this.finishToken(d.types.braceR);case 58:return++this.pos,this.finishToken(d.types.colon);case 63:return++this.pos,
this.finishToken(d.types.question);case 96:if(6>this.options.ecmaVersion)break;++this.pos;return this.finishToken(d.types.backQuote);case 48:a=this.input.charCodeAt(this.pos+1);if(120===a||88===a)return this.readRadixNumber(16);if(6<=this.options.ecmaVersion){if(111===a||79===a)return this.readRadixNumber(8);if(98===a||66===a)return this.readRadixNumber(2)}case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return this.readNumber(!1);case 34:case 39:return this.readString(a);case 47:return this.readToken_slash();
case 37:case 42:return this.readToken_mult_modulo_exp(a);case 124:case 38:return this.readToken_pipe_amp(a);case 94:return this.readToken_caret();case 43:case 45:return this.readToken_plus_min(a);case 60:case 62:return this.readToken_lt_gt(a);case 61:case 33:return this.readToken_eq_excl(a);case 126:return this.finishOp(d.types.prefix,1)}this.raise(this.pos,"Unexpected character '"+g(a)+"'")};a.finishOp=function(a,b){var c=this.input.slice(this.pos,this.pos+b);this.pos+=b;return this.finishToken(a,
c)};var p=!!c("\uffff","u");a.readRegexp=function(){for(var a=this,b=void 0,e=void 0,f=this.pos;;){this.pos>=this.input.length&&this.raise(f,"Unterminated regular expression");var g=this.input.charAt(this.pos);n.lineBreak.test(g)&&this.raise(f,"Unterminated regular expression");if(b)b=!1;else{if("["===g)e=!0;else if("]"===g&&e)e=!1;else if("/"===g&&!e)break;b="\\"===g}++this.pos}b=this.input.slice(f,this.pos);++this.pos;e=this.readWord1();g=b;if(e){var h=/^[gim]*$/;6<=this.options.ecmaVersion&&(h=
/^[gimuy]*$/);h.test(e)||this.raise(f,"Invalid regular expression flag");0<=e.indexOf("u")&&!p&&(g=g.replace(/\\u\{([0-9a-fA-F]+)\}/g,function(b,c,d){c=Number("0x"+c);1114111<c&&a.raise(f+d+3,"Code point out of bounds");return"x"}),g=g.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"x"))}h=null;m||(c(g,void 0,f,this),h=c(b,e));return this.finishToken(d.types.regexp,{pattern:b,flags:e,value:h})};a.readInt=function(a,b){for(var c=this.pos,d=0,e=0,f=null==b?Infinity:b;e<f;++e){var k=this.input.charCodeAt(this.pos),
k=97<=k?k-97+10:65<=k?k-65+10:48<=k&&57>=k?k-48:Infinity;if(k>=a)break;++this.pos;d=d*a+k}return this.pos===c||null!=b&&this.pos-c!==b?null:d};a.readRadixNumber=function(a){this.pos+=2;var c=this.readInt(a);null==c&&this.raise(this.start+2,"Expected number in radix "+a);b.isIdentifierStart(this.fullCharCodeAtPos())&&this.raise(this.pos,"Identifier directly after number");return this.finishToken(d.types.num,c)};a.readNumber=function(a){var c=this.pos,e=!1,f=48===this.input.charCodeAt(this.pos);a||
null!==this.readInt(10)||this.raise(c,"Invalid number");a=this.input.charCodeAt(this.pos);46===a&&(++this.pos,this.readInt(10),e=!0,a=this.input.charCodeAt(this.pos));if(69===a||101===a)a=this.input.charCodeAt(++this.pos),43!==a&&45!==a||++this.pos,null===this.readInt(10)&&this.raise(c,"Invalid number"),e=!0;b.isIdentifierStart(this.fullCharCodeAtPos())&&this.raise(this.pos,"Identifier directly after number");a=this.input.slice(c,this.pos);var k=void 0;e?k=parseFloat(a):f&&1!==a.length?/[89]/.test(a)||
this.strict?this.raise(c,"Invalid number"):k=parseInt(a,8):k=parseInt(a,10);return this.finishToken(d.types.num,k)};a.readCodePoint=function(){if(123===this.input.charCodeAt(this.pos)){6>this.options.ecmaVersion&&this.unexpected();var a=++this.pos;var b=this.readHexChar(this.input.indexOf("}",this.pos)-this.pos);++this.pos;1114111<b&&this.raise(a,"Code point out of bounds")}else b=this.readHexChar(4);return b};a.readString=function(a){for(var b="",c=++this.pos;;){this.pos>=this.input.length&&this.raise(this.start,
"Unterminated string constant");var e=this.input.charCodeAt(this.pos);if(e===a)break;92===e?(b+=this.input.slice(c,this.pos),b+=this.readEscapedChar(!1),c=this.pos):(n.isNewLine(e)&&this.raise(this.start,"Unterminated string constant"),++this.pos)}b+=this.input.slice(c,this.pos++);return this.finishToken(d.types.string,b)};a.readTmplToken=function(){for(var a="",b=this.pos;;){this.pos>=this.input.length&&this.raise(this.start,"Unterminated template");var c=this.input.charCodeAt(this.pos);if(96===
c||36===c&&123===this.input.charCodeAt(this.pos+1)){if(this.pos===this.start&&this.type===d.types.template){if(36===c)return this.pos+=2,this.finishToken(d.types.dollarBraceL);++this.pos;return this.finishToken(d.types.backQuote)}a+=this.input.slice(b,this.pos);return this.finishToken(d.types.template,a)}if(92===c)a+=this.input.slice(b,this.pos),a+=this.readEscapedChar(!0),b=this.pos;else if(n.isNewLine(c)){a+=this.input.slice(b,this.pos);++this.pos;switch(c){case 13:10===this.input.charCodeAt(this.pos)&&
++this.pos;case 10:a+="\n";break;default:a+=String.fromCharCode(c)}this.options.locations&&(++this.curLine,this.lineStart=this.pos);b=this.pos}else++this.pos}};a.readEscapedChar=function(a){var b=this.input.charCodeAt(++this.pos);++this.pos;switch(b){case 110:return"\n";case 114:return"\r";case 120:return String.fromCharCode(this.readHexChar(2));case 117:return g(this.readCodePoint());case 116:return"\t";case 98:return"\b";case 118:return"\x0B";case 102:return"\f";case 13:10===this.input.charCodeAt(this.pos)&&
++this.pos;case 10:return this.options.locations&&(this.lineStart=this.pos,++this.curLine),"";default:if(48<=b&&55>=b){var b=this.input.substr(this.pos-1,3).match(/^[0-7]+/)[0],c=parseInt(b,8);255<c&&(b=b.slice(0,-1),c=parseInt(b,8));"0"!==b&&(this.strict||a)&&this.raise(this.pos-2,"Octal literal in strict mode");this.pos+=b.length-1;return String.fromCharCode(c)}return String.fromCharCode(b)}};a.readHexChar=function(a){var b=this.pos;a=this.readInt(16,a);null===a&&this.raise(b,"Bad character escape sequence");
return a};a.readWord1=function(){this.containsEsc=!1;for(var a="",c=!0,d=this.pos,e=6<=this.options.ecmaVersion;this.pos<this.input.length;){var f=this.fullCharCodeAtPos();if(b.isIdentifierChar(f,e))this.pos+=65535>=f?1:2;else if(92===f)this.containsEsc=!0,a+=this.input.slice(d,this.pos),d=this.pos,117!=this.input.charCodeAt(++this.pos)&&this.raise(this.pos,"Expecting Unicode escape sequence \\uXXXX"),++this.pos,f=this.readCodePoint(),(c?b.isIdentifierStart:b.isIdentifierChar)(f,e)||this.raise(d,
"Invalid Unicode escape"),a+=g(f),d=this.pos;else break;c=!1}return a+this.input.slice(d,this.pos)};a.readWord=function(){var a=this.readWord1(),b=d.types.name;(6<=this.options.ecmaVersion||!this.containsEsc)&&this.keywords.test(a)&&(b=d.keywords[a]);return this.finishToken(b,a)}},{"./identifier":2,"./locutil":5,"./state":10,"./tokentype":14,"./whitespace":16}],14:[function(a,l,f){function c(a,c){return new b(a,{beforeExpr:!0,binop:c})}function g(a){var c=1>=arguments.length||void 0===arguments[1]?
{}:arguments[1];c.keyword=a;h[a]=d["_"+a]=new b(a,c)}f.__esModule=!0;var b=function e(a){var b=1>=arguments.length||void 0===arguments[1]?{}:arguments[1];if(!(this instanceof e))throw new TypeError("Cannot call a class as a function");this.label=a;this.keyword=b.keyword;this.beforeExpr=!!b.beforeExpr;this.startsExpr=!!b.startsExpr;this.isLoop=!!b.isLoop;this.isAssign=!!b.isAssign;this.prefix=!!b.prefix;this.postfix=!!b.postfix;this.binop=b.binop||null;this.updateContext=null};f.TokenType=b;a={beforeExpr:!0};
l={startsExpr:!0};var d={num:new b("num",l),regexp:new b("regexp",l),string:new b("string",l),name:new b("name",l),eof:new b("eof"),bracketL:new b("[",{beforeExpr:!0,startsExpr:!0}),bracketR:new b("]"),braceL:new b("{",{beforeExpr:!0,startsExpr:!0}),braceR:new b("}"),parenL:new b("(",{beforeExpr:!0,startsExpr:!0}),parenR:new b(")"),comma:new b(",",a),semi:new b(";",a),colon:new b(":",a),dot:new b("."),question:new b("?",a),arrow:new b("=>",a),template:new b("template"),ellipsis:new b("...",a),backQuote:new b("`",
l),dollarBraceL:new b("${",{beforeExpr:!0,startsExpr:!0}),eq:new b("=",{beforeExpr:!0,isAssign:!0}),assign:new b("_=",{beforeExpr:!0,isAssign:!0}),incDec:new b("++/--",{prefix:!0,postfix:!0,startsExpr:!0}),prefix:new b("prefix",{beforeExpr:!0,prefix:!0,startsExpr:!0}),logicalOR:c("||",1),logicalAND:c("&&",2),bitwiseOR:c("|",3),bitwiseXOR:c("^",4),bitwiseAND:c("&",5),equality:c("==/!=",6),relational:c("</>",7),bitShift:c("<</>>",8),plusMin:new b("+/-",{beforeExpr:!0,binop:9,prefix:!0,startsExpr:!0}),
modulo:c("%",10),star:c("*",10),slash:c("/",10),starstar:new b("**",{beforeExpr:!0})};f.types=d;var h={};f.keywords=h;g("break");g("case",a);g("catch");g("continue");g("debugger");g("default",a);g("do",{isLoop:!0,beforeExpr:!0});g("else",a);g("finally");g("for",{isLoop:!0});g("function",l);g("if");g("return",a);g("switch");g("throw",a);g("try");g("var");g("const");g("while",{isLoop:!0});g("with");g("new",{beforeExpr:!0,startsExpr:!0});g("this",l);g("super",l);g("class");g("extends",a);g("export");
g("import");g("null",l);g("true",l);g("false",l);g("in",{beforeExpr:!0,binop:7});g("instanceof",{beforeExpr:!0,binop:7});g("typeof",{beforeExpr:!0,prefix:!0,startsExpr:!0});g("void",{beforeExpr:!0,prefix:!0,startsExpr:!0});g("delete",{beforeExpr:!0,prefix:!0,startsExpr:!0})},{}],15:[function(a,l,f){f.__esModule=!0;f.isArray=function(a){return"[object Array]"===Object.prototype.toString.call(a)};f.has=function(a,f){return Object.prototype.hasOwnProperty.call(a,f)}},{}],16:[function(a,l,f){f.__esModule=
!0;f.isNewLine=function(a){return 10===a||13===a||8232===a||8233==a};a=/\r\n?|\n|\u2028|\u2029/;f.lineBreak=a;f.lineBreakG=new RegExp(a.source,"g");f.nonASCIIwhitespace=/[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;f.skipWhiteSpace=/(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g},{}]},{},[3])(3)});
var UPNG = {};

	

UPNG.toRGBA8 = function(out)
{
	var w = out.width, h = out.height;
	if(out.tabs.acTL==null) return [UPNG.toRGBA8.decodeImage(out.data, w, h, out).buffer];
	
	var frms = [];
	if(out.frames[0].data==null) out.frames[0].data = out.data;
	
	var len = w*h*4, img = new Uint8Array(len), empty = new Uint8Array(len), prev=new Uint8Array(len);
	for(var i=0; i<out.frames.length; i++)
	{
		var frm = out.frames[i];
		var fx=frm.rect.x, fy=frm.rect.y, fw = frm.rect.width, fh = frm.rect.height;
		var fdata = UPNG.toRGBA8.decodeImage(frm.data, fw,fh, out);
		
		if(i!=0) for(var j=0; j<len; j++) prev[j]=img[j];
		
		if     (frm.blend==0) UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 0);
		else if(frm.blend==1) UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 1);
		
		frms.push(img.buffer.slice(0));
		
		if     (frm.dispose==0) {}
		else if(frm.dispose==1) UPNG._copyTile(empty, fw, fh, img, w, h, fx, fy, 0);
		else if(frm.dispose==2) for(var j=0; j<len; j++) img[j]=prev[j];
	}
	return frms;
}
UPNG.toRGBA8.decodeImage = function(data, w, h, out)
{
	var area = w*h, bpp = UPNG.decode._getBPP(out);
	var bpl = Math.ceil(w*bpp/8);	// bytes per line

	var bf = new Uint8Array(area*4), bf32 = new Uint32Array(bf.buffer);
	var ctype = out.ctype, depth = out.depth;
	var rs = UPNG._bin.readUshort;
	
	//console.log(ctype, depth);
	var time = Date.now();

	if     (ctype==6) { // RGB + alpha
		var qarea = area<<2;
		if(depth== 8) for(var i=0; i<qarea;i+=4) {  bf[i] = data[i];  bf[i+1] = data[i+1];  bf[i+2] = data[i+2];  bf[i+3] = data[i+3]; }
		if(depth==16) for(var i=0; i<qarea;i++ ) {  bf[i] = data[i<<1];  }
	}
	else if(ctype==2) {	// RGB
		var ts=out.tabs["tRNS"];
		if(ts==null) {
			if(depth== 8) for(var i=0; i<area; i++) {  var ti=i*3;  bf32[i] = (255<<24)|(data[ti+2]<<16)|(data[ti+1]<<8)|data[ti];  }
			if(depth==16) for(var i=0; i<area; i++) {  var ti=i*6;  bf32[i] = (255<<24)|(data[ti+4]<<16)|(data[ti+2]<<8)|data[ti];  }
		}
		else {  var tr=ts[0], tg=ts[1], tb=ts[2];
			if(depth== 8) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*3;  bf32[i] = (255<<24)|(data[ti+2]<<16)|(data[ti+1]<<8)|data[ti];
				if(data[ti]   ==tr && data[ti+1]   ==tg && data[ti+2]   ==tb) bf[qi+3] = 0;  }
			if(depth==16) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6;  bf32[i] = (255<<24)|(data[ti+4]<<16)|(data[ti+2]<<8)|data[ti];
				if(rs(data,ti)==tr && rs(data,ti+2)==tg && rs(data,ti+4)==tb) bf[qi+3] = 0;  }
		}
	}
	else if(ctype==3) {	// palette
		var p=out.tabs["PLTE"], ap=out.tabs["tRNS"], tl=ap?ap.length:0;
		//console.log(p, ap);
		if(depth==1) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>3)]>>(7-((i&7)<<0)))& 1), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==2) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>2)]>>(6-((i&3)<<1)))& 3), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==4) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>1)]>>(4-((i&1)<<2)))&15), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==8) for(var i=0; i<area; i++ ) {  var qi=i<<2, j=data[i]                      , cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
	}
	else if(ctype==4) {	// gray + alpha
		if(depth== 8)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<1, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+1];  }
		if(depth==16)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<2, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+2];  }
	}
	else if(ctype==0) {	// gray
		var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
		for(var y=0; y<h; y++) {
			var off = y*bpl, to = y*w;
			if     (depth== 1) for(var x=0; x<w; x++) {  var gr=255*((data[off+(x>>>3)]>>>(7 -((x&7)   )))& 1), al=(gr==tr*255)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
			else if(depth== 2) for(var x=0; x<w; x++) {  var gr= 85*((data[off+(x>>>2)]>>>(6 -((x&3)<<1)))& 3), al=(gr==tr* 85)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
			else if(depth== 4) for(var x=0; x<w; x++) {  var gr= 17*((data[off+(x>>>1)]>>>(4 -((x&1)<<2)))&15), al=(gr==tr* 17)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
			else if(depth== 8) for(var x=0; x<w; x++) {  var gr=data[off+     x], al=(gr                 ==tr)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
			else if(depth==16) for(var x=0; x<w; x++) {  var gr=data[off+(x<<1)], al=(rs(data,off+(x<<i))==tr)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		}
	}
	//console.log(Date.now()-time);
	return bf;
}



UPNG.decode = function(buff)
{
	var data = new Uint8Array(buff), offset = 8, bin = UPNG._bin, rUs = bin.readUshort, rUi = bin.readUint;
	var out = {tabs:{}, frames:[]};
	var dd = new Uint8Array(data.length), doff = 0;	 // put all IDAT data into it
	var fd, foff = 0;	// frames
	
	var mgck = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for(var i=0; i<8; i++) if(data[i]!=mgck[i]) throw "The input is not a PNG file!";

	while(offset<data.length)
	{
		var len  = bin.readUint(data, offset);  offset += 4;
		var type = bin.readASCII(data, offset, 4);  offset += 4;
		//console.log(type,len);
		
		if     (type=="IHDR")  {  UPNG.decode._IHDR(data, offset, out);  }
		else if(type=="IDAT") {
			for(var i=0; i<len; i++) dd[doff+i] = data[offset+i];
			doff += len;
		}
		else if(type=="acTL")  {
			out.tabs[type] = {  num_frames:rUi(data, offset), num_plays:rUi(data, offset+4)  };
			fd = new Uint8Array(data.length);
		}
		else if(type=="fcTL")  {
			if(foff!=0) {  var fr = out.frames[out.frames.length-1];
				fr.data = UPNG.decode._decompress(out, fd.slice(0,foff), fr.rect.width, fr.rect.height);  foff=0;
			}
			var rct = {x:rUi(data, offset+12),y:rUi(data, offset+16),width:rUi(data, offset+4),height:rUi(data, offset+8)};
			var del = rUs(data, offset+22);  del = rUs(data, offset+20) / (del==0?100:del);
			var frm = {rect:rct, delay:Math.round(del*1000), dispose:data[offset+24], blend:data[offset+25]};
			//console.log(frm);
			out.frames.push(frm);
		}
		else if(type=="fdAT") {
			for(var i=0; i<len-4; i++) fd[foff+i] = data[offset+i+4];
			foff += len-4;
		}
		else if(type=="pHYs") {
			out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset+4), data[offset+8]];
		}
		else if(type=="cHRM") {
			out.tabs[type] = [];
			for(var i=0; i<8; i++) out.tabs[type].push(bin.readUint(data, offset+i*4));
		}
		else if(type=="tEXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = bin.nextZero(data, offset);
			var keyw = bin.readASCII(data, offset, nz-offset);
			var text = bin.readASCII(data, nz+1, offset+len-nz-1);
			out.tabs[type][keyw] = text;
		}
		else if(type=="iTXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = 0, off = offset;
			nz = bin.nextZero(data, off);
			var keyw = bin.readASCII(data, off, nz-off);  off = nz + 1;
			var cflag = data[off], cmeth = data[off+1];  off+=2;
			nz = bin.nextZero(data, off);
			var ltag = bin.readASCII(data, off, nz-off);  off = nz + 1;
			nz = bin.nextZero(data, off);
			var tkeyw = bin.readUTF8(data, off, nz-off);  off = nz + 1;
			var text  = bin.readUTF8(data, off, len-(off-offset));
			out.tabs[type][keyw] = text;
		}
		else if(type=="PLTE") {
			out.tabs[type] = bin.readBytes(data, offset, len);
		}
		else if(type=="hIST") {
			var pl = out.tabs["PLTE"].length/3;
			out.tabs[type] = [];  for(var i=0; i<pl; i++) out.tabs[type].push(rUs(data, offset+i*2));
		}
		else if(type=="tRNS") {
			if     (out.ctype==3) out.tabs[type] = bin.readBytes(data, offset, len);
			else if(out.ctype==0) out.tabs[type] = rUs(data, offset);
			else if(out.ctype==2) out.tabs[type] = [ rUs(data,offset),rUs(data,offset+2),rUs(data,offset+4) ];
			//else console.log("tRNS for unsupported color type",out.ctype, len);
		}
		else if(type=="gAMA") out.tabs[type] = bin.readUint(data, offset)/100000;
		else if(type=="sRGB") out.tabs[type] = data[offset];
		else if(type=="bKGD")
		{
			if     (out.ctype==0 || out.ctype==4) out.tabs[type] = [rUs(data, offset)];
			else if(out.ctype==2 || out.ctype==6) out.tabs[type] = [rUs(data, offset), rUs(data, offset+2), rUs(data, offset+4)];
			else if(out.ctype==3) out.tabs[type] = data[offset];
		}
		else if(type=="IEND") {
			break;
		}
		//else {  log("unknown chunk type", type, len);  }
		offset += len;
		var crc = bin.readUint(data, offset);  offset += 4;
	}
	if(foff!=0) {  var fr = out.frames[out.frames.length-1];
		fr.data = UPNG.decode._decompress(out, fd.slice(0,foff), fr.rect.width, fr.rect.height);  foff=0;
	}	
	out.data = UPNG.decode._decompress(out, dd, out.width, out.height);
	
	delete out.compress;  delete out.interlace;  delete out.filter;
	return out;
}

UPNG.decode._decompress = function(out, dd, w, h) {
	var time = Date.now();
	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8), buff = new Uint8Array((bpl+1+out.interlace)*h);
	dd = UPNG.decode._inflate(dd,buff);
	//console.log(dd.length, buff.length);
	//console.log(Date.now()-time);

	var time=Date.now();
	if     (out.interlace==0) dd = UPNG.decode._filterZero(dd, out, 0, w, h);
	else if(out.interlace==1) dd = UPNG.decode._readInterlace(dd, out);
	//console.log(Date.now()-time);
	return dd;
}

UPNG.decode._inflate = function(data, buff) {  var out=UPNG["inflateRaw"](new Uint8Array(data.buffer, 2,data.length-6),buff);  return out;  }
UPNG.inflateRaw=function(){var H={};H.H={};H.H.N=function(N,W){var R=Uint8Array,i=0,m=0,J=0,h=0,Q=0,X=0,u=0,w=0,d=0,v,C;
if(N[0]==3&&N[1]==0)return W?W:new R(0);var V=H.H,n=V.b,A=V.e,l=V.R,M=V.n,I=V.A,e=V.Z,b=V.m,Z=W==null;
if(Z)W=new R(N.length>>>2<<3);while(i==0){i=n(N,d,1);m=n(N,d+1,2);d+=3;if(m==0){if((d&7)!=0)d+=8-(d&7);
var D=(d>>>3)+4,q=N[D-4]|N[D-3]<<8;if(Z)W=H.H.W(W,w+q);W.set(new R(N.buffer,N.byteOffset+D,q),w);d=D+q<<3;
w+=q;continue}if(Z)W=H.H.W(W,w+(1<<17));if(m==1){v=b.J;C=b.h;X=(1<<9)-1;u=(1<<5)-1}if(m==2){J=A(N,d,5)+257;
h=A(N,d+5,5)+1;Q=A(N,d+10,4)+4;d+=14;var E=d,j=1;for(var c=0;c<38;c+=2){b.Q[c]=0;b.Q[c+1]=0}for(var c=0;
c<Q;c++){var K=A(N,d+c*3,3);b.Q[(b.X[c]<<1)+1]=K;if(K>j)j=K}d+=3*Q;M(b.Q,j);I(b.Q,j,b.u);v=b.w;C=b.d;
d=l(b.u,(1<<j)-1,J+h,N,d,b.v);var r=V.V(b.v,0,J,b.C);X=(1<<r)-1;var S=V.V(b.v,J,h,b.D);u=(1<<S)-1;M(b.C,r);
I(b.C,r,v);M(b.D,S);I(b.D,S,C)}while(!0){var T=v[e(N,d)&X];d+=T&15;var p=T>>>4;if(p>>>8==0){W[w++]=p}else if(p==256){break}else{var z=w+p-254;
if(p>264){var _=b.q[p-257];z=w+(_>>>3)+A(N,d,_&7);d+=_&7}var $=C[e(N,d)&u];d+=$&15;var s=$>>>4,Y=b.c[s],a=(Y>>>4)+n(N,d,Y&15);
d+=Y&15;while(w<z){W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a]}w=z}}}return W.length==w?W:W.slice(0,w)};
H.H.W=function(N,W){var R=N.length;if(W<=R)return N;var V=new Uint8Array(R<<1);V.set(N,0);return V};
H.H.R=function(N,W,R,V,n,A){var l=H.H.e,M=H.H.Z,I=0;while(I<R){var e=N[M(V,n)&W];n+=e&15;var b=e>>>4;
if(b<=15){A[I]=b;I++}else{var Z=0,m=0;if(b==16){m=3+l(V,n,2);n+=2;Z=A[I-1]}else if(b==17){m=3+l(V,n,3);
n+=3}else if(b==18){m=11+l(V,n,7);n+=7}var J=I+m;while(I<J){A[I]=Z;I++}}}return n};H.H.V=function(N,W,R,V){var n=0,A=0,l=V.length>>>1;
while(A<R){var M=N[A+W];V[A<<1]=0;V[(A<<1)+1]=M;if(M>n)n=M;A++}while(A<l){V[A<<1]=0;V[(A<<1)+1]=0;A++}return n};
H.H.n=function(N,W){var R=H.H.m,V=N.length,n,A,l,M,I,e=R.j;for(var M=0;M<=W;M++)e[M]=0;for(M=1;M<V;M+=2)e[N[M]]++;
var b=R.K;n=0;e[0]=0;for(A=1;A<=W;A++){n=n+e[A-1]<<1;b[A]=n}for(l=0;l<V;l+=2){I=N[l+1];if(I!=0){N[l]=b[I];
b[I]++}}};H.H.A=function(N,W,R){var V=N.length,n=H.H.m,A=n.r;for(var l=0;l<V;l+=2)if(N[l+1]!=0){var M=l>>1,I=N[l+1],e=M<<4|I,b=W-I,Z=N[l]<<b,m=Z+(1<<b);
while(Z!=m){var J=A[Z]>>>15-W;R[J]=e;Z++}}};H.H.l=function(N,W){var R=H.H.m.r,V=15-W;for(var n=0;n<N.length;
n+=2){var A=N[n]<<W-N[n+1];N[n]=R[A]>>>V}};H.H.M=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8};
H.H.I=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8;N[V+2]|=R>>>16};H.H.e=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8)>>>(W&7)&(1<<R)-1};
H.H.b=function(N,W,R){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)&(1<<R)-1};H.H.Z=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)};
H.H.i=function(N,W){return(N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16|N[(W>>>3)+3]<<24)>>>(W&7)};H.H.m=function(){var N=Uint16Array,W=Uint32Array;
return{K:new N(16),j:new N(16),X:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],S:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],T:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0],q:new N(32),p:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,65535,65535],z:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0],c:new W(32),J:new N(512),_:[],h:new N(32),$:[],w:new N(32768),C:[],v:[],d:new N(32768),D:[],u:new N(512),Q:[],r:new N(1<<15),s:new W(286),Y:new W(30),a:new W(19),t:new W(15e3),k:new N(1<<16),g:new N(1<<15)}}();
(function(){var N=H.H.m,W=1<<15;for(var R=0;R<W;R++){var V=R;V=(V&2863311530)>>>1|(V&1431655765)<<1;
V=(V&3435973836)>>>2|(V&858993459)<<2;V=(V&4042322160)>>>4|(V&252645135)<<4;V=(V&4278255360)>>>8|(V&16711935)<<8;
N.r[R]=(V>>>16|V<<16)>>>17}function n(A,l,M){while(l--!=0)A.push(0,M)}for(var R=0;R<32;R++){N.q[R]=N.S[R]<<3|N.T[R];
N.c[R]=N.p[R]<<4|N.z[R]}n(N._,144,8);n(N._,255-143,9);n(N._,279-255,7);n(N._,287-279,8);H.H.n(N._,9);
H.H.A(N._,9,N.J);H.H.l(N._,9);n(N.$,32,5);H.H.n(N.$,5);H.H.A(N.$,5,N.h);H.H.l(N.$,5);n(N.Q,19,0);n(N.C,286,0);
n(N.D,30,0);n(N.v,320,0)}());return H.H.N}()


UPNG.decode._readInterlace = function(data, out)
{
	var w = out.width, h = out.height;
	var bpp = UPNG.decode._getBPP(out), cbpp = bpp>>3, bpl = Math.ceil(w*bpp/8);
	var img = new Uint8Array( h * bpl );
	var di = 0;

	var starting_row  = [ 0, 0, 4, 0, 2, 0, 1 ];
	var starting_col  = [ 0, 4, 0, 2, 0, 1, 0 ];
	var row_increment = [ 8, 8, 8, 4, 4, 2, 2 ];
	var col_increment = [ 8, 8, 4, 4, 2, 2, 1 ];

	var pass=0;
	while(pass<7)
	{
		var ri = row_increment[pass], ci = col_increment[pass];
		var sw = 0, sh = 0;
		var cr = starting_row[pass];  while(cr<h) {  cr+=ri;  sh++;  }
		var cc = starting_col[pass];  while(cc<w) {  cc+=ci;  sw++;  }
		var bpll = Math.ceil(sw*bpp/8);
		UPNG.decode._filterZero(data, out, di, sw, sh);

		var y=0, row = starting_row[pass];
		while(row<h)
		{
			var col = starting_col[pass];
			var cdi = (di+y*bpll)<<3;

			while(col<w)
			{
				if(bpp==1) {
					var val = data[cdi>>3];  val = (val>>(7-(cdi&7)))&1;
					img[row*bpl + (col>>3)] |= (val << (7-((col&7)<<0)));
				}
				if(bpp==2) {
					var val = data[cdi>>3];  val = (val>>(6-(cdi&7)))&3;
					img[row*bpl + (col>>2)] |= (val << (6-((col&3)<<1)));
				}
				if(bpp==4) {
					var val = data[cdi>>3];  val = (val>>(4-(cdi&7)))&15;
					img[row*bpl + (col>>1)] |= (val << (4-((col&1)<<2)));
				}
				if(bpp>=8) {
					var ii = row*bpl+col*cbpp;
					for(var j=0; j<cbpp; j++) img[ii+j] = data[(cdi>>3)+j];
				}
				cdi+=bpp;  col+=ci;
			}
			y++;  row += ri;
		}
		if(sw*sh!=0) di += sh * (1 + bpll);
		pass = pass + 1;
	}
	return img;
}

UPNG.decode._getBPP = function(out) {
	var noc = [1,null,3,1,2,null,4][out.ctype];
	return noc * out.depth;
}

UPNG.decode._filterZero = function(data, out, off, w, h)
{
	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8), paeth = UPNG.decode._paeth;
	bpp = Math.ceil(bpp/8);
	
	var i=0, di=1, type=data[off], x=0;
	
	if(type>1) data[off]=[0,0,1][type-2];  
	if(type==3) for(x=bpp; x<bpl; x++) data[x+1] = (data[x+1] + (data[x+1-bpp]>>>1) )&255;

	for(var y=0; y<h; y++)  {
		i = off+y*bpl; di = i+y+1;
		type = data[di-1]; x=0;

		if     (type==0)   for(; x<bpl; x++) data[i+x] = data[di+x];
		else if(type==1) { for(; x<bpp; x++) data[i+x] = data[di+x];
						   for(; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp]);  }
		else if(type==2) { for(; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl]);  }
		else if(type==3) { for(; x<bpp; x++) data[i+x] = (data[di+x] + ( data[i+x-bpl]>>>1));
			               for(; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>>1) );  }
		else             { for(; x<bpp; x++) data[i+x] = (data[di+x] + paeth(0, data[i+x-bpl], 0));
						   for(; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) );  }
	}
	return data;
}

UPNG.decode._paeth = function(a,b,c)
{
	var p = a+b-c, pa = (p-a), pb = (p-b), pc = (p-c);
	if (pa*pa <= pb*pb && pa*pa <= pc*pc)  return a;
	else if (pb*pb <= pc*pc)  return b;
	return c;
}

UPNG.decode._IHDR = function(data, offset, out)
{
	var bin = UPNG._bin;
	out.width  = bin.readUint(data, offset);  offset += 4;
	out.height = bin.readUint(data, offset);  offset += 4;
	out.depth     = data[offset];  offset++;
	out.ctype     = data[offset];  offset++;
	out.compress  = data[offset];  offset++;
	out.filter    = data[offset];  offset++;
	out.interlace = data[offset];  offset++;
}

UPNG._bin = {
	nextZero   : function(data,p)  {  while(data[p]!=0) p++;  return p;  },
	readUshort : function(buff,p)  {  return (buff[p]<< 8) | buff[p+1];  },
	writeUshort: function(buff,p,n){  buff[p] = (n>>8)&255;  buff[p+1] = n&255;  },
	readUint   : function(buff,p)  {  return (buff[p]*(256*256*256)) + ((buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3]);  },
	writeUint  : function(buff,p,n){  buff[p]=(n>>24)&255;  buff[p+1]=(n>>16)&255;  buff[p+2]=(n>>8)&255;  buff[p+3]=n&255;  },
	readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    },
	writeASCII : function(data,p,s){  for(var i=0; i<s.length; i++) data[p+i] = s.charCodeAt(i);  },
	readBytes  : function(buff,p,l){  var arr = [];   for(var i=0; i<l; i++) arr.push(buff[p+i]);   return arr;  },
	pad : function(n) { return n.length < 2 ? "0" + n : n; },
	readUTF8 : function(buff, p, l) {
		var s = "", ns;
		for(var i=0; i<l; i++) s += "%" + UPNG._bin.pad(buff[p+i].toString(16));
		try {  ns = decodeURIComponent(s); }
		catch(e) {  return UPNG._bin.readASCII(buff, p, l);  }
		return  ns;
	}
}
UPNG._copyTile = function(sb, sw, sh, tb, tw, th, xoff, yoff, mode)
{
	var w = Math.min(sw,tw), h = Math.min(sh,th);
	var si=0, ti=0;
	for(var y=0; y<h; y++)
		for(var x=0; x<w; x++)
		{
			if(xoff>=0 && yoff>=0) {  si = (y*sw+x)<<2;  ti = (( yoff+y)*tw+xoff+x)<<2;  }
			else                   {  si = ((-yoff+y)*sw-xoff+x)<<2;  ti = (y*tw+x)<<2;  }
			
			if     (mode==0) {  tb[ti] = sb[si];  tb[ti+1] = sb[si+1];  tb[ti+2] = sb[si+2];  tb[ti+3] = sb[si+3];  }
			else if(mode==1) {
				var fa = sb[si+3]*(1/255), fr=sb[si]*fa, fg=sb[si+1]*fa, fb=sb[si+2]*fa; 
				var ba = tb[ti+3]*(1/255), br=tb[ti]*ba, bg=tb[ti+1]*ba, bb=tb[ti+2]*ba; 
				
				var ifa=1-fa, oa = fa+ba*ifa, ioa = (oa==0?0:1/oa);
				tb[ti+3] = 255*oa;  
				tb[ti+0] = (fr+br*ifa)*ioa;  
				tb[ti+1] = (fg+bg*ifa)*ioa;   
				tb[ti+2] = (fb+bb*ifa)*ioa;  
			}
			else if(mode==2){	// copy only differences, otherwise zero
				var fa = sb[si+3], fr=sb[si], fg=sb[si+1], fb=sb[si+2]; 
				var ba = tb[ti+3], br=tb[ti], bg=tb[ti+1], bb=tb[ti+2]; 
				if(fa==ba && fr==br && fg==bg && fb==bb) {  tb[ti]=0;  tb[ti+1]=0;  tb[ti+2]=0;  tb[ti+3]=0;  }
				else {  tb[ti]=fr;  tb[ti+1]=fg;  tb[ti+2]=fb;  tb[ti+3]=fa;  }
			}
			else if(mode==3){	// check if can be blended
				var fa = sb[si+3], fr=sb[si], fg=sb[si+1], fb=sb[si+2]; 
				var ba = tb[ti+3], br=tb[ti], bg=tb[ti+1], bb=tb[ti+2]; 
				if(fa==ba && fr==br && fg==bg && fb==bb) continue;
				//if(fa!=255 && ba!=0) return false;
				if(fa<220 && ba>20) return false;
			}
		}
	return true;
}


UPNG.encode = function(bufs, w, h, ps, dels, tabs, forbidPlte)
{
	if(ps==null) ps=0;
	if(forbidPlte==null) forbidPlte = false;

	var nimg = UPNG.encode.compress(bufs, w, h, ps, [false, false, false, 0, forbidPlte]);
	UPNG.encode.compressPNG(nimg, -1);
	
	return UPNG.encode._main(nimg, w, h, dels, tabs);
}

UPNG.encodeLL = function(bufs, w, h, cc, ac, depth, dels, tabs) {
	var nimg = {  ctype: 0 + (cc==1 ? 0 : 2) + (ac==0 ? 0 : 4),      depth: depth,  frames: []  };
	
	var time = Date.now();
	var bipp = (cc+ac)*depth, bipl = bipp * w;
	for(var i=0; i<bufs.length; i++)
		nimg.frames.push({  rect:{x:0,y:0,width:w,height:h},  img:new Uint8Array(bufs[i]), blend:0, dispose:1, bpp:Math.ceil(bipp/8), bpl:Math.ceil(bipl/8)  });
	
	UPNG.encode.compressPNG(nimg, 0, true);
	
	var out = UPNG.encode._main(nimg, w, h, dels, tabs);
	return out;
}

UPNG.encode._main = function(nimg, w, h, dels, tabs) {
	if(tabs==null) tabs={};
	var crc = UPNG.crc.crc, wUi = UPNG._bin.writeUint, wUs = UPNG._bin.writeUshort, wAs = UPNG._bin.writeASCII;
	var offset = 8, anim = nimg.frames.length>1, pltAlpha = false;
	
	var leng = 8 + (16+5+4) /*+ (9+4)*/ + (anim ? 20 : 0);
	if(tabs["sRGB"]!=null) leng += 8+1+4;
	if(tabs["pHYs"]!=null) leng += 8+9+4;
	if(nimg.ctype==3) {
		var dl = nimg.plte.length;
		for(var i=0; i<dl; i++) if((nimg.plte[i]>>>24)!=255) pltAlpha = true;
		leng += (8 + dl*3 + 4) + (pltAlpha ? (8 + dl*1 + 4) : 0);
	}
	for(var j=0; j<nimg.frames.length; j++)
	{
		var fr = nimg.frames[j];
		if(anim) leng += 38;
		leng += fr.cimg.length + 12;
		if(j!=0) leng+=4;
	}
	leng += 12; 
	
	var data = new Uint8Array(leng);
	var wr=[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for(var i=0; i<8; i++) data[i]=wr[i];
	
	wUi(data,offset, 13);     offset+=4;
	wAs(data,offset,"IHDR");  offset+=4;
	wUi(data,offset,w);  offset+=4;
	wUi(data,offset,h);  offset+=4;
	data[offset] = nimg.depth;  offset++;  // depth
	data[offset] = nimg.ctype;  offset++;  // ctype
	data[offset] = 0;  offset++;  // compress
	data[offset] = 0;  offset++;  // filter
	data[offset] = 0;  offset++;  // interlace
	wUi(data,offset,crc(data,offset-17,17));  offset+=4; // crc

	// 13 bytes to say, that it is sRGB
	if(tabs["sRGB"]!=null) {
		wUi(data,offset, 1);      offset+=4;
		wAs(data,offset,"sRGB");  offset+=4;
		data[offset] = tabs["sRGB"];  offset++;
		wUi(data,offset,crc(data,offset-5,5));  offset+=4; // crc
	}
	if(tabs["pHYs"]!=null) {
		wUi(data,offset, 9);      offset+=4;
		wAs(data,offset,"pHYs");  offset+=4;
		wUi(data,offset, tabs["pHYs"][0]);      offset+=4;
		wUi(data,offset, tabs["pHYs"][1]);      offset+=4;
		data[offset]=tabs["pHYs"][2];			offset++;
		wUi(data,offset,crc(data,offset-13,13));  offset+=4; // crc
	}

	if(anim) {
		wUi(data,offset, 8);      offset+=4;
		wAs(data,offset,"acTL");  offset+=4;
		wUi(data,offset, nimg.frames.length);     offset+=4;
		wUi(data,offset, tabs["loop"]!=null?tabs["loop"]:0);      offset+=4;
		wUi(data,offset,crc(data,offset-12,12));  offset+=4; // crc
	}

	if(nimg.ctype==3) {
		var dl = nimg.plte.length;
		wUi(data,offset, dl*3);  offset+=4;
		wAs(data,offset,"PLTE");  offset+=4;
		for(var i=0; i<dl; i++){
			var ti=i*3, c=nimg.plte[i], r=(c)&255, g=(c>>>8)&255, b=(c>>>16)&255;
			data[offset+ti+0]=r;  data[offset+ti+1]=g;  data[offset+ti+2]=b;
		}
		offset+=dl*3;
		wUi(data,offset,crc(data,offset-dl*3-4,dl*3+4));  offset+=4; // crc

		if(pltAlpha) {
			wUi(data,offset, dl);  offset+=4;
			wAs(data,offset,"tRNS");  offset+=4;
			for(var i=0; i<dl; i++)  data[offset+i]=(nimg.plte[i]>>>24)&255;
			offset+=dl;
			wUi(data,offset,crc(data,offset-dl-4,dl+4));  offset+=4; // crc
		}
	}
	
	var fi = 0;
	for(var j=0; j<nimg.frames.length; j++)
	{
		var fr = nimg.frames[j];
		if(anim) {
			wUi(data, offset, 26);     offset+=4;
			wAs(data, offset,"fcTL");  offset+=4;
			wUi(data, offset, fi++);   offset+=4;
			wUi(data, offset, fr.rect.width );   offset+=4;
			wUi(data, offset, fr.rect.height);   offset+=4;
			wUi(data, offset, fr.rect.x);   offset+=4;
			wUi(data, offset, fr.rect.y);   offset+=4;
			wUs(data, offset, dels[j]);   offset+=2;
			wUs(data, offset,  1000);   offset+=2;
			data[offset] = fr.dispose;  offset++;	// dispose
			data[offset] = fr.blend  ;  offset++;	// blend
			wUi(data,offset,crc(data,offset-30,30));  offset+=4; // crc
		}
				
		var imgd = fr.cimg, dl = imgd.length;
		wUi(data,offset, dl+(j==0?0:4));     offset+=4;
		var ioff = offset;
		wAs(data,offset,(j==0)?"IDAT":"fdAT");  offset+=4;
		if(j!=0) {  wUi(data, offset, fi++);  offset+=4;  }
		data.set(imgd,offset);
		offset += dl;
		wUi(data,offset,crc(data,ioff,offset-ioff));  offset+=4; // crc
	}

	wUi(data,offset, 0);     offset+=4;
	wAs(data,offset,"IEND");  offset+=4;
	wUi(data,offset,crc(data,offset-4,4));  offset+=4; // crc

	return data.buffer;
}

UPNG.encode.compressPNG = function(out, filter, levelZero) {
	for(var i=0; i<out.frames.length; i++) {
		var frm = out.frames[i], nw=frm.rect.width, nh=frm.rect.height;
		var fdata = new Uint8Array(nh*frm.bpl+nh);
		frm.cimg = UPNG.encode._filterZero(frm.img,nh,frm.bpp,frm.bpl,fdata, filter, levelZero);
	}
}



UPNG.encode.compress = function(bufs, w, h, ps, prms) // prms:  onlyBlend, minBits, forbidPlte
{
	//var time = Date.now();
	var onlyBlend = prms[0], evenCrd = prms[1], forbidPrev = prms[2], minBits = prms[3], forbidPlte = prms[4];
	
	var ctype = 6, depth = 8, alphaAnd=255
	
	for(var j=0; j<bufs.length; j++)  {  // when not quantized, other frames can contain colors, that are not in an initial frame
		var img = new Uint8Array(bufs[j]), ilen = img.length;
		for(var i=0; i<ilen; i+=4) alphaAnd &= img[i+3];
	}
	var gotAlpha = (alphaAnd!=255);
	
	//console.log("alpha check", Date.now()-time);  time = Date.now();
	
	//var brute = gotAlpha && forGIF;		// brute : frames can only be copied, not "blended"
	var frms = UPNG.encode.framize(bufs, w, h, onlyBlend, evenCrd, forbidPrev);
	//console.log("framize", Date.now()-time);  time = Date.now();
	
	var cmap={}, plte=[], inds=[];  
	
	if(ps!=0) {
		var nbufs = [];  for(var i=0; i<frms.length; i++) nbufs.push(frms[i].img.buffer);
		
		var abuf = UPNG.encode.concatRGBA(nbufs), qres = UPNG.quantize(abuf, ps);  
		var cof = 0, bb = new Uint8Array(qres.abuf);
		for(var i=0; i<frms.length; i++) {  var ti=frms[i].img, bln=ti.length;  inds.push(new Uint8Array(qres.inds.buffer, cof>>2, bln>>2));
			for(var j=0; j<bln; j+=4) {  ti[j]=bb[cof+j];  ti[j+1]=bb[cof+j+1];  ti[j+2]=bb[cof+j+2];  ti[j+3]=bb[cof+j+3];  }    cof+=bln;  }
		
		for(var i=0; i<qres.plte.length; i++) plte.push(qres.plte[i].est.rgba);
		//console.log("quantize", Date.now()-time);  time = Date.now();
	}
	else {
		// what if ps==0, but there are <=256 colors?  we still need to detect, if the palette could be used
		for(var j=0; j<frms.length; j++)  {  // when not quantized, other frames can contain colors, that are not in an initial frame
			var frm = frms[j], img32 = new Uint32Array(frm.img.buffer), nw=frm.rect.width, ilen = img32.length;
			var ind = new Uint8Array(ilen);  inds.push(ind);
			for(var i=0; i<ilen; i++) {
				var c = img32[i];
				if     (i!=0 && c==img32[i- 1]) ind[i]=ind[i-1];
				else if(i>nw && c==img32[i-nw]) ind[i]=ind[i-nw];
				else {
					var cmc = cmap[c];
					if(cmc==null) {  cmap[c]=cmc=plte.length;  plte.push(c);  if(plte.length>=300) break;  }
					ind[i]=cmc;
				}
			}
		}
		//console.log("make palette", Date.now()-time);  time = Date.now();
	}
	
	var cc=plte.length; //console.log("colors:",cc);
	if(cc<=256 && forbidPlte==false) {
		if(cc<= 2) depth=1;  else if(cc<= 4) depth=2;  else if(cc<=16) depth=4;  else depth=8;
		depth =  Math.max(depth, minBits);
	}
	
	for(var j=0; j<frms.length; j++)
	{
		var frm = frms[j], nx=frm.rect.x, ny=frm.rect.y, nw=frm.rect.width, nh=frm.rect.height;
		var cimg = frm.img, cimg32 = new Uint32Array(cimg.buffer);
		var bpl = 4*nw, bpp=4;
		if(cc<=256 && forbidPlte==false) {
			bpl = Math.ceil(depth*nw/8);
			var nimg = new Uint8Array(bpl*nh);
			var inj = inds[j];
			for(var y=0; y<nh; y++) {  var i=y*bpl, ii=y*nw;
				if     (depth==8) for(var x=0; x<nw; x++) nimg[i+(x)   ]   =  (inj[ii+x]             );
				else if(depth==4) for(var x=0; x<nw; x++) nimg[i+(x>>1)]  |=  (inj[ii+x]<<(4-(x&1)*4));
				else if(depth==2) for(var x=0; x<nw; x++) nimg[i+(x>>2)]  |=  (inj[ii+x]<<(6-(x&3)*2));
				else if(depth==1) for(var x=0; x<nw; x++) nimg[i+(x>>3)]  |=  (inj[ii+x]<<(7-(x&7)*1));
			}
			cimg=nimg;  ctype=3;  bpp=1;
		}
		else if(gotAlpha==false && frms.length==1) {	// some next "reduced" frames may contain alpha for blending
			var nimg = new Uint8Array(nw*nh*3), area=nw*nh;
			for(var i=0; i<area; i++) { var ti=i*3, qi=i*4;  nimg[ti]=cimg[qi];  nimg[ti+1]=cimg[qi+1];  nimg[ti+2]=cimg[qi+2];  }
			cimg=nimg;  ctype=2;  bpp=3;  bpl=3*nw;
		}
		frm.img=cimg;  frm.bpl=bpl;  frm.bpp=bpp;
	}
	//console.log("colors => palette indices", Date.now()-time);  time = Date.now();
	
	return {ctype:ctype, depth:depth, plte:plte, frames:frms  };
}
UPNG.encode.framize = function(bufs,w,h,alwaysBlend,evenCrd,forbidPrev) {
	/*  DISPOSE
	    - 0 : no change
		- 1 : clear to transparent
		- 2 : retstore to content before rendering (previous frame disposed)
		BLEND
		- 0 : replace
		- 1 : blend
	*/
	var frms = [];
	for(var j=0; j<bufs.length; j++) {
		var cimg = new Uint8Array(bufs[j]), cimg32 = new Uint32Array(cimg.buffer);
		var nimg;
		
		var nx=0, ny=0, nw=w, nh=h, blend=alwaysBlend?1:0;
		if(j!=0) {
			var tlim = (forbidPrev || alwaysBlend || j==1 || frms[j-2].dispose!=0)?1:2, tstp = 0, tarea = 1e9;
			for(var it=0; it<tlim; it++)
			{
				var pimg = new Uint8Array(bufs[j-1-it]), p32 = new Uint32Array(bufs[j-1-it]);
				var mix=w,miy=h,max=-1,may=-1;
				for(var y=0; y<h; y++) for(var x=0; x<w; x++) {
					var i = y*w+x;
					if(cimg32[i]!=p32[i]) {
						if(x<mix) mix=x;  if(x>max) max=x;
						if(y<miy) miy=y;  if(y>may) may=y;
					}
				}
				if(max==-1) mix=miy=max=may=0;
				if(evenCrd) {  if((mix&1)==1)mix--;  if((miy&1)==1)miy--;  }
				var sarea = (max-mix+1)*(may-miy+1);
				if(sarea<tarea) {
					tarea = sarea;  tstp = it;
					nx = mix; ny = miy; nw = max-mix+1; nh = may-miy+1;
				}
			}
			
			// alwaysBlend: pokud zjistím, že blendit nelze, nastavím předchozímu snímku dispose=1. Zajistím, aby obsahoval můj obdélník.
			var pimg = new Uint8Array(bufs[j-1-tstp]);
			if(tstp==1) frms[j-1].dispose = 2;
			
			nimg = new Uint8Array(nw*nh*4);
			UPNG._copyTile(pimg,w,h, nimg,nw,nh, -nx,-ny, 0);
			
			blend =  UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, 3) ? 1 : 0;
			if(blend==1) UPNG.encode._prepareDiff(cimg,w,h,nimg,{x:nx,y:ny,width:nw,height:nh});
			else         UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, 0);
			//UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, blend==1?2:0);
		}
		else nimg = cimg.slice(0);	// img may be rewritten further ... don't rewrite input
		
		frms.push({rect:{x:nx,y:ny,width:nw,height:nh}, img:nimg, blend:blend, dispose:0});
	}
	
	
	if(alwaysBlend) for(var j=0; j<frms.length; j++) {
		var frm = frms[j];  if(frm.blend==1) continue;
		var r0 = frm.rect, r1 = frms[j-1].rect
		var miX = Math.min(r0.x, r1.x), miY = Math.min(r0.y, r1.y);
		var maX = Math.max(r0.x+r0.width, r1.x+r1.width), maY = Math.max(r0.y+r0.height, r1.y+r1.height);
		var r = {x:miX, y:miY, width:maX-miX, height:maY-miY};
		
		frms[j-1].dispose = 1;
		if(j-1!=0) 
		UPNG.encode._updateFrame(bufs, w,h,frms, j-1,r, evenCrd);
		UPNG.encode._updateFrame(bufs, w,h,frms, j  ,r, evenCrd);
	}
	var area = 0;
	if(bufs.length!=1) for(var i=0; i<frms.length; i++) {
		var frm = frms[i];
		area += frm.rect.width*frm.rect.height;
		//if(i==0 || frm.blend!=1) continue;
		//var ob = new Uint8Array(
		//console.log(frm.blend, frm.dispose, frm.rect);
	}
	//if(area!=0) console.log(area);
	return frms;
}
UPNG.encode._updateFrame = function(bufs, w,h, frms, i, r, evenCrd) {
	var U8 = Uint8Array, U32 = Uint32Array;
	var pimg = new U8(bufs[i-1]), pimg32 = new U32(bufs[i-1]), nimg = i+1<bufs.length ? new U8(bufs[i+1]):null;
	var cimg = new U8(bufs[i]), cimg32 = new U32(cimg.buffer);
	
	var mix=w,miy=h,max=-1,may=-1;
	for(var y=0; y<r.height; y++) for(var x=0; x<r.width; x++) {
		var cx = r.x+x, cy = r.y+y;
		var j = cy*w+cx, cc = cimg32[j];
		// no need to draw transparency, or to dispose it. Or, if writing the same color and the next one does not need transparency.
		if(cc==0 || (frms[i-1].dispose==0 && pimg32[j]==cc && (nimg==null || nimg[j*4+3]!=0))/**/) {}
		else {
			if(cx<mix) mix=cx;  if(cx>max) max=cx;
			if(cy<miy) miy=cy;  if(cy>may) may=cy;
		}
	}
	if(max==-1) mix=miy=max=may=0;
	if(evenCrd) {  if((mix&1)==1)mix--;  if((miy&1)==1)miy--;  }
	r = {x:mix, y:miy, width:max-mix+1, height:may-miy+1};
	
	var fr = frms[i];  fr.rect = r;  fr.blend = 1;  fr.img = new Uint8Array(r.width*r.height*4);
	if(frms[i-1].dispose==0) {
		UPNG._copyTile(pimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 0);
		UPNG.encode._prepareDiff(cimg,w,h,fr.img,r);
		//UPNG._copyTile(cimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 2);
	}
	else
		UPNG._copyTile(cimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 0);
}
UPNG.encode._prepareDiff = function(cimg, w,h, nimg, rec) {
	UPNG._copyTile(cimg,w,h, nimg,rec.width,rec.height, -rec.x,-rec.y, 2);
	/*
	var n32 = new Uint32Array(nimg.buffer);
	var og = new Uint8Array(rec.width*rec.height*4), o32 = new Uint32Array(og.buffer);
	UPNG._copyTile(cimg,w,h, og,rec.width,rec.height, -rec.x,-rec.y, 0);
	for(var i=4; i<nimg.length; i+=4) {
		if(nimg[i-1]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)-1]) {
			n32[i>>>2]=o32[i>>>2];
			//var j = i, c=p32[(i>>>2)-1];
			//while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
		}
	}
	for(var i=nimg.length-8; i>0; i-=4) {
		if(nimg[i+7]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)+1]) {
			n32[i>>>2]=o32[i>>>2];
			//var j = i, c=p32[(i>>>2)-1];
			//while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
		}
	}*/
}

UPNG.encode._filterZero = function(img,h,bpp,bpl,data, filter, levelZero)
{
	var fls = [], ftry=[0,1,2,3,4];
	if     (filter!=-1)             ftry=[filter];
	else if(h*bpl>500000 || bpp==1) ftry=[0];
	var opts;  if(levelZero) opts={level:0};
	
	var CMPR = (levelZero && UZIP!=null) ? UZIP : pako;
	
	for(var i=0; i<ftry.length; i++) {
		for(var y=0; y<h; y++) UPNG.encode._filterLine(data, img, y, bpl, bpp, ftry[i]);
		//var nimg = new Uint8Array(data.length);
		//var sz = UZIP.F.deflate(data, nimg);  fls.push(nimg.slice(0,sz));
		//var dfl = pako["deflate"](data), dl=dfl.length-4;
		//var crc = (dfl[dl+3]<<24)|(dfl[dl+2]<<16)|(dfl[dl+1]<<8)|(dfl[dl+0]<<0);
		//console.log(crc, UZIP.adler(data,2,data.length-6));
		fls.push(CMPR["deflate"](data,opts));
	}
	var ti, tsize=1e9;
	for(var i=0; i<fls.length; i++) if(fls[i].length<tsize) {  ti=i;  tsize=fls[i].length;  }
	return fls[ti];
}
UPNG.encode._filterLine = function(data, img, y, bpl, bpp, type)
{
	var i = y*bpl, di = i+y, paeth = UPNG.decode._paeth
	data[di]=type;  di++;

	if(type==0) {
		if(bpl<500) for(var x=0; x<bpl; x++) data[di+x] = img[i+x];
		else data.set(new Uint8Array(img.buffer,i,bpl),di);
	}
	else if(type==1) {
		for(var x=  0; x<bpp; x++) data[di+x] =  img[i+x];
		for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]-img[i+x-bpp]+256)&255;
	}
	else if(y==0) {
		for(var x=  0; x<bpp; x++) data[di+x] = img[i+x];

		if(type==2) for(var x=bpp; x<bpl; x++) data[di+x] = img[i+x];
		if(type==3) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - (img[i+x-bpp]>>1) +256)&255;
		if(type==4) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - paeth(img[i+x-bpp], 0, 0) +256)&255;
	}
	else {
		if(type==2) { for(var x=  0; x<bpl; x++) data[di+x] = (img[i+x]+256 - img[i+x-bpl])&255;  }
		if(type==3) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - (img[i+x-bpl]>>1))&255;
					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - ((img[i+x-bpl]+img[i+x-bpp])>>1))&255;  }
		if(type==4) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - paeth(0, img[i+x-bpl], 0))&255;
					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - paeth(img[i+x-bpp], img[i+x-bpl], img[i+x-bpp-bpl]))&255;  }
	}
}

UPNG.crc = {
	table : ( function() {
	   var tab = new Uint32Array(256);
	   for (var n=0; n<256; n++) {
			var c = n;
			for (var k=0; k<8; k++) {
				if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
				else        c = c >>> 1;
			}
			tab[n] = c;  }
		return tab;  })(),
	update : function(c, buf, off, len) {
		for (var i=0; i<len; i++)  c = UPNG.crc.table[(c ^ buf[off+i]) & 0xff] ^ (c >>> 8);
		return c;
	},
	crc : function(b,o,l)  {  return UPNG.crc.update(0xffffffff,b,o,l) ^ 0xffffffff;  }
}


UPNG.quantize = function(abuf, ps)
{	
	var oimg = new Uint8Array(abuf), nimg = oimg.slice(0), nimg32 = new Uint32Array(nimg.buffer);
	
	var KD = UPNG.quantize.getKDtree(nimg, ps);
	var root = KD[0], leafs = KD[1];
	
	var planeDst = UPNG.quantize.planeDst;
	var sb = oimg, tb = nimg32, len=sb.length;
		
	var inds = new Uint8Array(oimg.length>>2);
	for(var i=0; i<len; i+=4) {
		var r=sb[i]*(1/255), g=sb[i+1]*(1/255), b=sb[i+2]*(1/255), a=sb[i+3]*(1/255);
		
		//  exact, but too slow :(
		var nd = UPNG.quantize.getNearest(root, r, g, b, a);
		//var nd = root;
		//while(nd.left) nd = (planeDst(nd.est,r,g,b,a)<=0) ? nd.left : nd.right;
		
		inds[i>>2] = nd.ind;
		tb[i>>2] = nd.est.rgba;
	}
	return {  abuf:nimg.buffer, inds:inds, plte:leafs  };
}

UPNG.quantize.getKDtree = function(nimg, ps, err) {
	if(err==null) err = 0.0001;
	var nimg32 = new Uint32Array(nimg.buffer);
	
	var root = {i0:0, i1:nimg.length, bst:null, est:null, tdst:0, left:null, right:null };  // basic statistic, extra statistic
	root.bst = UPNG.quantize.stats(  nimg,root.i0, root.i1  );  root.est = UPNG.quantize.estats( root.bst );
	var leafs = [root];
	
	while(leafs.length<ps)
	{
		var maxL = 0, mi=0;
		for(var i=0; i<leafs.length; i++) if(leafs[i].est.L > maxL) {  maxL=leafs[i].est.L;  mi=i;  }
		if(maxL<err) break;
		var node = leafs[mi];
		
		var s0 = UPNG.quantize.splitPixels(nimg,nimg32, node.i0, node.i1, node.est.e, node.est.eMq255);
		var s0wrong = (node.i0>=s0 || node.i1<=s0);
		//console.log(maxL, leafs.length, mi);
		if(s0wrong) {  node.est.L=0;  continue;  }
		
		
		var ln = {i0:node.i0, i1:s0, bst:null, est:null, tdst:0, left:null, right:null };  ln.bst = UPNG.quantize.stats( nimg, ln.i0, ln.i1 );  
		ln.est = UPNG.quantize.estats( ln.bst );
		var rn = {i0:s0, i1:node.i1, bst:null, est:null, tdst:0, left:null, right:null };  rn.bst = {R:[], m:[], N:node.bst.N-ln.bst.N};
		for(var i=0; i<16; i++) rn.bst.R[i] = node.bst.R[i]-ln.bst.R[i];
		for(var i=0; i< 4; i++) rn.bst.m[i] = node.bst.m[i]-ln.bst.m[i];
		rn.est = UPNG.quantize.estats( rn.bst );
		
		node.left = ln;  node.right = rn;
		leafs[mi]=ln;  leafs.push(rn);
	}
	leafs.sort(function(a,b) {  return b.bst.N-a.bst.N;  });
	for(var i=0; i<leafs.length; i++) leafs[i].ind=i;
	return [root, leafs];
}

UPNG.quantize.getNearest = function(nd, r,g,b,a)
{
	if(nd.left==null) {  nd.tdst = UPNG.quantize.dist(nd.est.q,r,g,b,a);  return nd;  }
	var planeDst = UPNG.quantize.planeDst(nd.est,r,g,b,a);
	
	var node0 = nd.left, node1 = nd.right;
	if(planeDst>0) {  node0=nd.right;  node1=nd.left;  }
	
	var ln = UPNG.quantize.getNearest(node0, r,g,b,a);
	if(ln.tdst<=planeDst*planeDst) return ln;
	var rn = UPNG.quantize.getNearest(node1, r,g,b,a);
	return rn.tdst<ln.tdst ? rn : ln;
}
UPNG.quantize.planeDst = function(est, r,g,b,a) {  var e = est.e;  return e[0]*r + e[1]*g + e[2]*b + e[3]*a - est.eMq;  }
UPNG.quantize.dist     = function(q,   r,g,b,a) {  var d0=r-q[0], d1=g-q[1], d2=b-q[2], d3=a-q[3];  return d0*d0+d1*d1+d2*d2+d3*d3;  }

UPNG.quantize.splitPixels = function(nimg, nimg32, i0, i1, e, eMq)
{
	var vecDot = UPNG.quantize.vecDot;
	i1-=4;
	var shfs = 0;
	while(i0<i1)
	{
		while(vecDot(nimg, i0, e)<=eMq) i0+=4;
		while(vecDot(nimg, i1, e)> eMq) i1-=4;
		if(i0>=i1) break;
		
		var t = nimg32[i0>>2];  nimg32[i0>>2] = nimg32[i1>>2];  nimg32[i1>>2]=t;
		
		i0+=4;  i1-=4;
	}
	while(vecDot(nimg, i0, e)>eMq) i0-=4;
	return i0+4;
}
UPNG.quantize.vecDot = function(nimg, i, e)
{
	return nimg[i]*e[0] + nimg[i+1]*e[1] + nimg[i+2]*e[2] + nimg[i+3]*e[3];
}
UPNG.quantize.stats = function(nimg, i0, i1){
	var R = [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0];
	var m = [0,0,0,0];
	var N = (i1-i0)>>2;
	for(var i=i0; i<i1; i+=4)
	{
		var r = nimg[i]*(1/255), g = nimg[i+1]*(1/255), b = nimg[i+2]*(1/255), a = nimg[i+3]*(1/255);
		//var r = nimg[i], g = nimg[i+1], b = nimg[i+2], a = nimg[i+3];
		m[0]+=r;  m[1]+=g;  m[2]+=b;  m[3]+=a;
		
		R[ 0] += r*r;  R[ 1] += r*g;  R[ 2] += r*b;  R[ 3] += r*a;  
		               R[ 5] += g*g;  R[ 6] += g*b;  R[ 7] += g*a; 
		                              R[10] += b*b;  R[11] += b*a;  
		                                             R[15] += a*a;  
	}
	R[4]=R[1];  R[8]=R[2];  R[9]=R[6];  R[12]=R[3];  R[13]=R[7];  R[14]=R[11];
	
	return {R:R, m:m, N:N};
}
UPNG.quantize.estats = function(stats){
	var R = stats.R, m = stats.m, N = stats.N;
	
	// when all samples are equal, but N is large (millions), the Rj can be non-zero ( 0.0003.... - precission error)
	var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], iN = (N==0 ? 0 : 1/N);
	var Rj = [
		R[ 0] - m0*m0*iN,  R[ 1] - m0*m1*iN,  R[ 2] - m0*m2*iN,  R[ 3] - m0*m3*iN,  
		R[ 4] - m1*m0*iN,  R[ 5] - m1*m1*iN,  R[ 6] - m1*m2*iN,  R[ 7] - m1*m3*iN,
		R[ 8] - m2*m0*iN,  R[ 9] - m2*m1*iN,  R[10] - m2*m2*iN,  R[11] - m2*m3*iN,  
		R[12] - m3*m0*iN,  R[13] - m3*m1*iN,  R[14] - m3*m2*iN,  R[15] - m3*m3*iN 
	];
	
	var A = Rj, M = UPNG.M4;
	var b = [0.5,0.5,0.5,0.5], mi = 0, tmi = 0;
	
	if(N!=0)
	for(var i=0; i<10; i++) {
		b = M.multVec(A, b);  tmi = Math.sqrt(M.dot(b,b));  b = M.sml(1/tmi,  b);
		if(Math.abs(tmi-mi)<1e-9) break;  mi = tmi;
	}	
	//b = [0,0,1,0];  mi=N;
	var q = [m0*iN, m1*iN, m2*iN, m3*iN];
	var eMq255 = M.dot(M.sml(255,q),b);
	
	return {  Cov:Rj, q:q, e:b, L:mi,  eMq255:eMq255, eMq : M.dot(b,q),
				rgba: (((Math.round(255*q[3])<<24) | (Math.round(255*q[2])<<16) |  (Math.round(255*q[1])<<8) | (Math.round(255*q[0])<<0))>>>0)  };
}
UPNG.M4 = {
	multVec : function(m,v) {
			return [
				m[ 0]*v[0] + m[ 1]*v[1] + m[ 2]*v[2] + m[ 3]*v[3],
				m[ 4]*v[0] + m[ 5]*v[1] + m[ 6]*v[2] + m[ 7]*v[3],
				m[ 8]*v[0] + m[ 9]*v[1] + m[10]*v[2] + m[11]*v[3],
				m[12]*v[0] + m[13]*v[1] + m[14]*v[2] + m[15]*v[3]
			];
	},
	dot : function(x,y) {  return  x[0]*y[0]+x[1]*y[1]+x[2]*y[2]+x[3]*y[3];  },
	sml : function(a,y) {  return [a*y[0],a*y[1],a*y[2],a*y[3]];  }
}

UPNG.encode.concatRGBA = function(bufs) {
	var tlen = 0;
	for(var i=0; i<bufs.length; i++) tlen += bufs[i].byteLength;
	var nimg = new Uint8Array(tlen), noff=0;
	for(var i=0; i<bufs.length; i++) {
		var img = new Uint8Array(bufs[i]), il = img.length;
		for(var j=0; j<il; j+=4) {  
			var r=img[j], g=img[j+1], b=img[j+2], a = img[j+3];
			if(a==0) r=g=b=0;
			nimg[noff+j]=r;  nimg[noff+j+1]=g;  nimg[noff+j+2]=b;  nimg[noff+j+3]=a;  }
		noff += il;
	}
	return nimg.buffer;
}
	
	
	UTEX = {}
	
	UTEX.readATC = function(data, offset, img, w, h)
	{
		var sqr = new Uint8Array(4*4*4);
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{
				UTEX.readATCcolor(data, offset, sqr);
				UTEX.write4x4(img, w, h, x, y, sqr);
				offset += 8;
			}
		return offset;
	}
	UTEX.readATA = function(data, offset, img, w, h)
	{
		var sqr = new Uint8Array(4*4*4);
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4) {
				UTEX.readATCcolor(data, offset+8, sqr);  
				/*
				for(var i=0; i<64; i+=4) {
					var code = UTEX.readBits(data, pos, 4);
					sqr[i+3] = 255*(code/15);
				}
				*/
				UTEX.write4x4(img, w, h, x, y, sqr);
				offset += 16;
			}
		return offset;
	}
	UTEX.readBC1 = function(data, offset, img, w, h)
	{
		var sqr = new Uint8Array(4*4*4);
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{
				UTEX.readBCcolor(data, offset, sqr);
				UTEX.write4x4(img, w, h, x, y, sqr);
				offset += 8;
			}
		return offset;
	}
	UTEX.writeBC1 = function(img, w, h, data, offset)
	{
		var sqr = new Uint8Array(16*4);
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{
				UTEX.read4x4(img,w,h,x,y,sqr);
				UTEX.writeBCcolor(data, offset, sqr);
				offset+=8;
			}
		return offset;
	}
	UTEX.readBC2 = function(data, offset, img, w, h)
	{
		var pos = {boff:offset*8};
		var sqr = new Uint8Array(4*4*4);
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4) {
				UTEX.readBCcolor(data, offset+8, sqr);  
				for(var i=0; i<64; i+=4) {
					var code = UTEX.readBits(data, pos, 4);
					sqr[i+3] = 255*(code/15);
				}
				UTEX.write4x4(img, w, h, x, y, sqr);
				offset += 16;  pos.boff+=64;
			}
		return offset;
	}
	
	UTEX.inter8 = function(a,b)
	{
		var al = [ a,b ];  
				
		if( a > b ) al.push(
			6/7*a + 1/7*b, // bit code 010
			5/7*a + 2/7*b, // bit code 011
			4/7*a + 3/7*b, // bit code 100
			3/7*a + 4/7*b, // bit code 101
			2/7*a + 5/7*b, // bit code 110
			1/7*a + 6/7*b  );
		else
			al.push(
			4/5*a + 1/5*b, // bit code 010
			3/5*a + 2/5*b, // bit code 011
			2/5*a + 3/5*b, // bit code 100
			1/5*a + 4/5*b, // bit code 101
			0,                     // bit code 110
			255            );
		return al;
	}
	
	UTEX.readBC3 = function(data, offset, img, w, h)
	{
		var pos = {boff:offset*8};
		var sqr = new Uint8Array(4*4*4);
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{				
				UTEX.readBCcolor(data, offset+8, sqr);
				
				var al = UTEX.inter8(data[offset], data[offset+1]);	pos.boff+=16;
				for(var i=0; i<64; i+=4) {
					var code = UTEX.readBits(data, pos, 3);
					sqr[i+3] = al[code];
				}
				pos.boff+=64;
				UTEX.write4x4(img, w, h, x, y, sqr);
				offset += 16;
			}
		return offset;
	}
	UTEX.writeBC3 = function(img, w, h, data, offset)
	{
		var sqr = new Uint8Array(16*4);
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{
				UTEX.read4x4(img,w,h,x,y,sqr);
				var min=sqr[3], max=sqr[3];
				for(var i=7; i<64; i+=4) {  var a = sqr[i];  if(a<min)min=a;  else if(max<a)max=a;  }
				data[offset]=max;  data[offset+1]=min;  offset+=2;
				
				var al = UTEX.inter8(max, min);
				var boff = (offset+2)<<3;
				for(var i=0; i<64; i+=32) {
					var bits=0, boff=0;
					for(var j=0; j<32; j+=4) {
						var code = 0, cd=500;
						var a=sqr[i+j+3];
						for(var k=0; k<8; k++) {  var dst=Math.abs(al[k]-a);  if(dst<cd) {  cd=dst;  code=k;  }  }
						bits = bits|(code<<boff);  boff+=3;
					}
					data[offset]=(bits);  data[offset+1]=(bits>>8);  data[offset+2]=(bits>>16);
					offset+=3;
				}
				
				UTEX.writeBCcolor(data, offset, sqr);
				offset+=8;
			}
		return offset;
	}
	
	UTEX._arr16 = new Uint8Array(16);
	UTEX.readATCcolor = function(data, offset, sqr)
	{		
		var c0 = (data[offset+1]<<8)|data[offset  ];
		var c1 = (data[offset+3]<<8)|data[offset+2];
		
		var c0b = (c0&31)*(255/31), c0g = ((c0>>>5)&31)*(255/31), c0r = (c0>>10)*(255/31);
		var c1b = (c1&31)*(255/31), c1g = ((c1>>>5)&63)*(255/63), c1r = (c1>>11)*(255/31);
		
		var clr = UTEX._arr16;
		clr[ 0] = ~~(c0r);  clr[ 1] = ~~(c0g);  clr[ 2] = ~~(c0b);  clr[ 3] = 255;
		clr[12] = ~~(c1r);  clr[13] = ~~(c1g);  clr[14] = ~~(c1b);  clr[15] = 255;
		var fr = 2/3, ifr = 1-fr;
		clr[ 4] = ~~(fr*c0r + ifr*c1r);  clr[ 5] = ~~(fr*c0g + ifr*c1g);  clr[ 6] = ~~(fr*c0b + ifr*c1b);  clr[ 7] = 255;
		fr = 1/3;  ifr=1-fr;
		clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;		
		
		UTEX.toSquare(data, sqr, clr, offset);
	}
	UTEX.readBCcolor = function(data, offset, sqr)
	{		
		var c0 = (data[offset+1]<<8)|data[offset  ];
		var c1 = (data[offset+3]<<8)|data[offset+2];
		
		var c0b = (c0&31)*(255/31), c0g = ((c0>>>5)&63)*(255/63), c0r = (c0>>11)*(255/31);
		var c1b = (c1&31)*(255/31), c1g = ((c1>>>5)&63)*(255/63), c1r = (c1>>11)*(255/31);
		
		var clr = UTEX._arr16;
		clr[0] = ~~(c0r);  clr[1] = ~~(c0g);  clr[2] = ~~(c0b);  clr[3] = 255;
		clr[4] = ~~(c1r);  clr[5] = ~~(c1g);  clr[6] = ~~(c1b);  clr[7] = 255;
		if(c1<c0) {
			var fr = 2/3, ifr = 1-fr;
			clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;
			fr = 1/3;  ifr=1-fr;
			clr[12] = ~~(fr*c0r + ifr*c1r);  clr[13] = ~~(fr*c0g + ifr*c1g);  clr[14] = ~~(fr*c0b + ifr*c1b);  clr[15] = 255;
		}
		else {
			var fr = 1/2, ifr = 1-fr;
			clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;
			clr[12] = 0;  clr[13] = 0;  clr[14] = 0;  clr[15] = 0;
		}
		UTEX.toSquare(data, sqr, clr, offset);
	}
	UTEX.writeBCcolor = function(data, offset, sqr) {
		var dist = UTEX.colorDist;
		var ends = UTEX.mostDistant(sqr);
		
		var c0r = sqr[(ends >>8)] , c0g = sqr[(ends >>8)+1] , c0b = sqr[(ends >>8)+2] ;
		var c1r = sqr[(ends&255)] , c1g = sqr[(ends&255)+1] , c1b = sqr[(ends&255)+2] ;
		
		var c0 =  ( ( c0r >> 3 ) << 11 ) | ( ( c0g >> 2 ) << 5 ) | ( c0b >> 3 ); 
		var c1 =  ( ( c1r >> 3 ) << 11 ) | ( ( c1g >> 2 ) << 5 ) | ( c1b >> 3 );
		if(c0<c1) {  var t=c0;  c0=c1;  c1=t;  }
		
		var c0b = Math.floor((c0&31)*(255/31)), c0g = Math.floor(((c0>>>5)&63)*(255/63)), c0r = Math.floor((c0>>11)*(255/31));
		var c1b = Math.floor((c1&31)*(255/31)), c1g = Math.floor(((c1>>>5)&63)*(255/63)), c1r = Math.floor((c1>>11)*(255/31));
		
		data[offset+0]=(c0&255);  data[offset+1] = (c0>>8);
		data[offset+2]=(c1&255);  data[offset+3] = (c1>>8);
		
		var fr = 2/3, ifr = 1-fr;
		var c2r = Math.floor(fr*c0r + ifr*c1r), c2g = Math.floor(fr*c0g + ifr*c1g), c2b = Math.floor(fr*c0b + ifr*c1b);
		fr = 1/3;  ifr=1-fr;
		var c3r = Math.floor(fr*c0r + ifr*c1r), c3g = Math.floor(fr*c0g + ifr*c1g), c3b = Math.floor(fr*c0b + ifr*c1b);
		
		
		var boff = offset*8+32;
		for(var i=0; i<64; i+=4) {
			var r=sqr[i], g=sqr[i+1], b=sqr[i+2];
			
			var ds0 = dist(r,g,b,c0r,c0g,c0b);
			var ds1 = dist(r,g,b,c1r,c1g,c1b);
			var ds2 = dist(r,g,b,c2r,c2g,c2b);
			var ds3 = dist(r,g,b,c3r,c3g,c3b);
			var dsm = Math.min(ds0, Math.min(ds1, Math.min(ds2, ds3)));
			
			var code=0;
			if(dsm==ds1) code=1;
			else if(dsm==ds2) code=2;
			else if(dsm==ds3) code=3;
			
			data[boff>>3] |= (code<<(boff&7));
			boff+=2;
		}
	}
	UTEX.toSquare = function(data, sqr, clr, offset)
	{
		var boff = (offset+4)<<3;
		for(var i=0; i<64; i+=4) {
			var code = ((data[boff>>3]>>((boff&7)))&3);  boff+=2;
			code = (code<<2);
			sqr[i  ] = clr[code  ];
			sqr[i+1] = clr[code+1];
			sqr[i+2] = clr[code+2];
			sqr[i+3] = clr[code+3];
		}
	}
	
	UTEX.read4x4 = function(a, w, h, sx,sy, b)	// read from large
	{
		for(var y=0; y<4; y++) {
			var si = ((sy+y)*w+sx)<<2, ti = y<<4;
			b[ti+ 0] = a[si+ 0];  b[ti+ 1] = a[si+ 1];  b[ti+ 2] = a[si+ 2];  b[ti+ 3] = a[si+ 3];
			b[ti+ 4] = a[si+ 4];  b[ti+ 5] = a[si+ 5];  b[ti+ 6] = a[si+ 6];  b[ti+ 7] = a[si+ 7];
			b[ti+ 8] = a[si+ 8];  b[ti+ 9] = a[si+ 9];  b[ti+10] = a[si+10];  b[ti+11] = a[si+11];
			b[ti+12] = a[si+12];  b[ti+13] = a[si+13];  b[ti+14] = a[si+14];  b[ti+15] = a[si+15];
		}
	}
	UTEX.write4x4 = function(a, w, h, sx,sy, b)	// write to large
	{
		for(var y=0; y<4; y++) {
			var si = ((sy+y)*w+sx)<<2, ti = y<<4;
			a[si+ 0] = b[ti+ 0];  a[si+ 1] = b[ti+ 1];  a[si+ 2] = b[ti+ 2];  a[si+ 3] = b[ti+ 3];
			a[si+ 4] = b[ti+ 4];  a[si+ 5] = b[ti+ 5];  a[si+ 6] = b[ti+ 6];  a[si+ 7] = b[ti+ 7];
			a[si+ 8] = b[ti+ 8];  a[si+ 9] = b[ti+ 9];  a[si+10] = b[ti+10];  a[si+11] = b[ti+11];
			a[si+12] = b[ti+12];  a[si+13] = b[ti+13];  a[si+14] = b[ti+14];  a[si+15] = b[ti+15];
		}
	}
	
	UTEX._subs2 = ["0011001100110011","0001000100010001","0111011101110111","0001001100110111","0000000100010011","0011011101111111","0001001101111111","0000000100110111","0000000000010011","0011011111111111","0000000101111111","0000000000010111","0001011111111111","0000000011111111","0000111111111111","0000000000001111","0000100011101111","0111000100000000","0000000010001110","0111001100010000","0011000100000000","0000100011001110","0000000010001100","0111001100110001","0011000100010000","0000100010001100","0110011001100110","0011011001101100","0001011111101000","0000111111110000","0111000110001110","0011100110011100","0101010101010101","0000111100001111","0101101001011010","0011001111001100","0011110000111100","0101010110101010","0110100101101001","0101101010100101","0111001111001110","0001001111001000","0011001001001100","0011101111011100","0110100110010110","0011110011000011","0110011010011001","0000011001100000","0100111001000000","0010011100100000","0000001001110010","0000010011100100","0110110010010011","0011011011001001","0110001110011100","0011100111000110","0110110011001001","0110001100111001","0111111010000001","0001100011100111","0000111100110011","0011001111110000","0010001011101110","0100010001110111"];
	UTEX._subs3 = ["0011001102212222","0001001122112221","0000200122112211","0222002200110111","0000000011221122","0011001100220022","0022002211111111","0011001122112211","0000000011112222","0000111111112222","0000111122222222","0012001200120012","0112011201120112","0122012201220122","0011011211221222","0011200122002220","0001001101121122","0111001120012200","0000112211221122","0022002200221111","0111011102220222","0001000122212221","0000001101220122","0000110022102210","0122012200110000","0012001211222222","0110122112210110","0000011012211221","0022110211020022","0110011020022222","0011012201220011","0000200022112221","0000000211221222","0222002200120011","0011001200220222","0120012001200120","0000111122220000","0120120120120120","0120201212010120","0011220011220011","0011112222000011","0101010122222222","0000000021212121","0022112200221122","0022001100220011","0220122102201221","0101222222220101","0000212121212121","0101010101012222","0222011102220111","0002111200021112","0000211221122112","0222011101110222","0002111211120002","0110011001102222","0000000021122112","0110011022222222","0022001100110022","0022112211220022","0000000000002112","0002000100020001","0222122202221222","0101222222222222","0111201122012220"]
	UTEX._anch2 = [[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,2,0],[0,8,0],[0,2,0],[0,2,0],[0,8,0],[0,8,0],[0,15,0],[0,2,0],[0,8,0],[0,2,0],[0,2,0],[0,8,0],[0,8,0],[0,2,0],[0,2,0],[0,15,0],[0,15,0],[0,6,0],[0,8,0],[0,2,0],[0,8,0],[0,15,0],[0,15,0],[0,2,0],[0,8,0],[0,2,0],[0,2,0],[0,2,0],[0,15,0],[0,15,0],[0,6,0],[0,6,0],[0,2,0],[0,6,0],[0,8,0],[0,15,0],[0,15,0],[0,2,0],[0,2,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,15,0],[0,2,0],[0,2,0],[0,15,0]];
	UTEX._anch3 = [[0,3,15],[0,3,8],[0,15,8],[0,15,3],[0,8,15],[0,3,15],[0,15,3],[0,15,8],[0,8,15],[0,8,15],[0,6,15],[0,6,15],[0,6,15],[0,5,15],[0,3,15],[0,3,8],[0,3,15],[0,3,8],[0,8,15],[0,15,3],[0,3,15],[0,3,8],[0,6,15],[0,10,8],[0,5,3],[0,8,15],[0,8,6],[0,6,10],[0,8,15],[0,5,15],[0,15,10],[0,15,8],[0,8,15],[0,15,3],[0,3,15],[0,5,10],[0,6,10],[0,10,8],[0,8,9],[0,15,10],[0,15,6],[0,3,15],[0,15,8],[0,5,15],[0,15,3],[0,15,6],[0,15,6],[0,15,8],[0,3,15],[0,15,3],[0,5,15],[0,5,15],[0,5,15],[0,8,15],[0,5,15],[0,10,15],[0,5,15],[0,10,15],[0,8,15],[0,13,15],[0,15,3],[0,12,15],[0,3,15],[0,3,8]];
	
	UTEX.readBC7 = function(data, offset, img, w, h)
	{
		var rB = UTEX.readBits;
		var pos = {boff:0};
		var sqr = new Uint8Array(4*4*4);
		
		var intp = [null,null,
			[0,21,43,64],
			[0,9,18,27,37,46,55,64],
			[0,4,9,13,17,21,26,30,34,38,43,47,51,55,60,64]
		];
		
		var subs = [ null, null, UTEX._subs2, UTEX._subs3 ];
		var ancs = [ null, null, UTEX._anch2, UTEX._anch3 ];
		
		for(var y=0; y<h; y+=4)
			for(var x=0; x<w; x+=4)
			{
				var mode = 0;
				while(((data[offset]>>mode)&1)!=1) mode++;
				
				pos.boff  = (offset<<3)+mode+1;
				
				var rot  = (mode==4 || mode==5) ? rB(data, pos, 2) : 0;
				var indx = (mode==4) ? rB(data, pos, 1) : 0;
				
				var prtlen = [4,6,6,6, 0,0,0,6][mode];
				var parti = rB(data, pos, prtlen);
				
				var clen = [4,6,5,7, 5,7,7,5][mode];
				var alen = [0,0,0,0, 6,8,7,5][mode];
				var plen = [1,1,0,1, 0,0,1,1][mode];
				var pnts = [6,4,6,4, 2,2,2,4][mode];
				
				var clr = [];
					
				for(var i=0; i<4; i++) {
					var len = i==3?alen:clen;
					for(var j=0; j<pnts; j++) clr[i*pnts+j] = rB(data, pos, len);
				}
				
				for(var j=0; j<pnts; j++) {
					if(mode==1 && ((j&1)==1)) pos.boff--;  // Ps shared per subset
					var bit = rB(data, pos, plen);
					for(var i=0; i<3; i++) clr[i*pnts+j] = (clr[i*pnts+j]<<plen)|bit;
					if(alen!=0) clr[3*pnts+j] = (clr[3*pnts+j]<<plen)|bit;
				}
				clen+=plen;  if(alen!=0) alen+=plen;
				
				for(var i=0; i<4; i++)
				{
					var len = i==3?alen:clen;
					var cf = len==0 ? 0 : 1/((1<<len)-1);
					for(var j=0; j<pnts; j++) clr[i*pnts+j] *= cf;
				}
				if(alen==0) for(var j=0; j<pnts; j++) clr[3*pnts+j] = 1;
				
				var scnt = [3,2,3,2, 1,1,1,2][mode];	// subset count
				var cind = [3,3,2,2, 2,2,4,2][mode];
				var aind = [0,0,0,0, 3,2,0,0][mode];
				
				var smap = "0000000000000000";
				var anci = [0,0,0];
				if(scnt!=1) {
					smap = subs[scnt][parti];
					anci = ancs[scnt][parti];
				}
				
				var coff = pos.boff;
				var aoff = coff + 16 * cind - scnt;
				if(indx==1) {  var t=coff;  coff=aoff;  aoff=t;  t=cind;  cind=aind;  aind=t;  }
				
				var cint = intp[cind];
				pos.boff = coff;
				
				for(var i=0; i<64; i+=4)
				{
					var ss = smap.charCodeAt(i>>2)-48;
					var first = anci[ss]==(i>>2) ? 1 : 0;
					var code = rB(data, pos, cind-first);
					
					var f = cint[code]/64;
					var r = (1-f)*clr[0*pnts + 2*ss + 0] + f*clr[0*pnts + 2*ss + 1];
					var g = (1-f)*clr[1*pnts + 2*ss + 0] + f*clr[1*pnts + 2*ss + 1];
					var b = (1-f)*clr[2*pnts + 2*ss + 0] + f*clr[2*pnts + 2*ss + 1];
					var a = (1-f)*clr[3*pnts + 2*ss + 0] + f*clr[3*pnts + 2*ss + 1];
					
					sqr[i  ] = r*255;
					sqr[i+1] = g*255;
					sqr[i+2] = b*255;
					sqr[i+3] = a*255;
				}
				
				cint = intp[aind];
				pos.boff = aoff;
				
				if(aind!=0) for(var i=0; i<64; i+=4)
				{
					var ss = smap.charCodeAt(i>>2)-48;
					var first = anci[ss]==(i>>2) ? 1 : 0;
					var code = rB(data, pos, aind-first);
					
					var f = cint[code]/64;
					var a = (1-f)*clr[3*pnts + 2*ss + 0] + f*clr[3*pnts + 2*ss + 1];
					sqr[i+3] = a*255;
				}
				
				
				UTEX.rotate(sqr, rot);
				UTEX.write4x4(img, w, h, x, y, sqr);
				
				offset += 16;
			}
		return offset;
	}
	UTEX.rotate = function(sqr, rot){
		if(rot==0) return;
		for(var i=0; i<64; i+=4)
		{
			var r=sqr[i  ];
			var g=sqr[i+1];
			var b=sqr[i+2];
			var a=sqr[i+3];
				
			if(rot==1) {  var t=a; a=r; r=t;  }
			if(rot==2) {  var t=a; a=g; g=t;  }
			if(rot==3) {  var t=a; a=b; b=t;  }
			
			sqr[i  ] = r;
			sqr[i+1] = g;
			sqr[i+2] = b;
			sqr[i+3] = a;
		}
	}
	
	UTEX.readBits = function(data, pos, k)
	{
		var out = 0, ok=k;
		while(k!=0) {  out = (out) | (UTEX.readBit(data, pos)<<(ok-k));  k--;  }
		return out;
	}
	UTEX.readBit = function(data, pos)
	{
		var boff = pos.boff;  pos.boff++;
		return ((data[boff>>3]>>((boff&7)))&1);
	}
	UTEX.mipmapB = function(buff, w, h)
	{
		var nw = w>>1, nh = h>>1;
		var nbuf = new Uint8Array(nw*nh*4);
		for(var y=0; y<nh; y++)
			for(var x=0; x<nw; x++) {
				var ti = (y*nw+x)<<2, si = ((y<<1)*w+(x<<1))<<2;
				//nbuf[ti  ] = buff[si  ];  nbuf[ti+1] = buff[si+1];  nbuf[ti+2] = buff[si+2];  nbuf[ti+3] = buff[si+3];
				//*
				var a0 = buff[si+3], a1 =  buff[si+7];
				var r = buff[si  ]*a0 + buff[si+4]*a1; 
				var g = buff[si+1]*a0 + buff[si+5]*a1;
				var b = buff[si+2]*a0 + buff[si+6]*a1;
				
				si+=(w<<2);
				
				var a2 = buff[si+3], a3 = buff[si+7];
				r    += buff[si  ]*a2 + buff[si+4]*a3;
				g    += buff[si+1]*a2 + buff[si+5]*a3;
				b    += buff[si+2]*a2 + buff[si+6]*a3;
				
				
				var a = (a0+a1+a2+a3+2)>>2, ia = (a==0) ? 0 : 0.25/a;
				nbuf[ti  ] = ~~(r*ia+0.5);
				nbuf[ti+1] = ~~(g*ia+0.5);
				nbuf[ti+2] = ~~(b*ia+0.5);
				nbuf[ti+3] = a;
			}
		return nbuf;
	}
	UTEX.colorDist = function(r,g,b, r0,g0,b0) {  return (r-r0)*(r-r0)+(g-g0)*(g-g0)+(b-b0)*(b-b0);  }
	
	UTEX.mostDistant = function(sqr)
	{
		var dist = UTEX.colorDist;
		var ends = 0, dd = 0;
		for(var i=0; i<64; i+=4) {
			var r = sqr[i], g = sqr[i+1], b = sqr[i+2];
			for(var j=i+4; j<64; j+=4) {
				var dst = dist(r,g,b, sqr[j],sqr[j+1],sqr[j+2]);
				if(dst>dd) {  dd=dst;  ends=(i<<8)|j;  }
			}
		}
		return ends;
	}
	UTEX.U = {
		_int8: new Uint8Array(4),
		readUintLE : function(buff, p)
		{
			UTEX.U._int8[0] = buff[p+0];
			UTEX.U._int8[1] = buff[p+1];
			UTEX.U._int8[2] = buff[p+2];
			UTEX.U._int8[3] = buff[p+3];
			return UTEX.U._int[0];
		},
		writeUintLE : function(buff, p, n)
		{
			UTEX.U._int[0] = n;
			buff[p+0] = UTEX.U._int8[0];
			buff[p+1] = UTEX.U._int8[1];
			buff[p+2] = UTEX.U._int8[2];
			buff[p+3] = UTEX.U._int8[3];
		},
		readASCII : function(buff, p, l)	// l : length in Characters (not Bytes)
		{
			var s = "";
			for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);
			return s;
		},
		writeASCII : function(buff, p, s)	// l : length in Characters (not Bytes)
		{
			for(var i = 0; i < s.length; i++)	
				buff[p+i] = s.charCodeAt(i);
		}
	}
	UTEX.U._int = new Uint32Array(UTEX.U._int8.buffer);
		
	if(UTEX==null) UTEX = {};
	
	UTEX.DDS = { 
		C : {
			DDSD_CAPS   : 0x1,  // always	// header flags
			DDSD_HEIGHT	: 0x2,  // always
			DDSD_WIDTH	: 0x4,  // always
			DDSD_PITCH  : 0x8,
			DDSD_PIXELFORMAT : 0x1000,	// always
			DDSD_MIPMAPCOUNT : 0x20000,
			DDSD_LINEARSIZE  : 0x80000,
			DDSD_DEPTH : 0x800000,
			
			DDPF_ALPHAPIXELS : 0x1,	// pixel format flags
			DDPF_ALPHA  : 0x2,
			DDPF_FOURCC : 0x4,
			DDPF_RGB    : 0x40,
			DDPF_YUV    : 0x200,
			DDPF_LUMINANCE : 0x20000,
			
			DDSCAPS_COMPLEX	: 0x8,
			DDSCAPS_MIPMAP  : 0x400000,
			DDSCAPS_TEXTURE : 0x1000
		},
	
		decode : function(buff)
		{
			var data = new Uint8Array(buff), offset = 0;
			var mgck = UTEX.U.readASCII(data, offset, 4);  offset+=4;
			
			var head, pf, hdr10, C = UTEX.DDS.C;
			
			head = UTEX.DDS.readHeader(data, offset);  offset += 124;
			pf = head.pixFormat;
			if( (pf.flags&C.DDPF_FOURCC) && pf.fourCC=="DX10") {  hdr10 = UTEX.DDS.readHeader10(data, offset);  offset+=20;  }
			//console.log(head, pf);
			//for(var fl in C) if(fl.startsWith("DDSD") && (head.flags&C[fl])!=0) console.log(C[fl].toString(16),fl);
			//console.log(head.pitch*8/(head.width*head.height/16), data.length, head.caps.toString(2));
			
			var w = head.width, h = head.height, out = [];
			var fmt = pf.fourCC, bc  = pf.bitCount;
			
			//var time = Date.now();
			var mcnt = Math.max(1, head.mmcount);
			for(var it=0; it<mcnt; it++)
			{
				var img = new Uint8Array(w * h * 4);
				if(false) {}
				else if(fmt=="DXT1") offset=UTEX.readBC1(data, offset, img, w, h);
				else if(fmt=="DXT3") offset=UTEX.readBC2(data, offset, img, w, h);
				else if(fmt=="DXT5") offset=UTEX.readBC3(data, offset, img, w, h);
				else if(fmt=="DX10") offset=UTEX.readBC7(data, offset, img, w, h);
				else if(fmt=="ATC ") offset=UTEX.readATC(data, offset, img, w, h);
				else if(fmt=="ATCA") offset=UTEX.readATA(data, offset, img, w, h);
				else if(fmt=="ATCI") offset=UTEX.readATA(data, offset, img, w, h);
				else if((pf.flags&C.DDPF_ALPHAPIXELS) && (pf.flags&C.DDPF_RGB)) {
					if     (bc==32) {
						for(var i=0; i<img.length; i++) img[i] = data[offset+i];
						offset+=img.length;
					}
					else if(bc==16) {
						for(var i=0; i<img.length; i+=4) {
							var clr = (data[offset+(i>>1)+1]<<8) | data[offset+(i>>1)];
							img[i+0] = 255*(clr&pf.RMask)/pf.RMask;
							img[i+1] = 255*(clr&pf.GMask)/pf.GMask;
							img[i+2] = 255*(clr&pf.BMask)/pf.BMask;
							img[i+3] = 255*(clr&pf.AMask)/pf.AMask;
						}
						offset+=(img.length>>1);
					}
					else throw ("unknown bit count "+bc);
				}
				else if((pf.flags&C.DDPF_ALPHA) || (pf.flags&C.DDPF_ALPHAPIXELS) || (pf.flags&C.DDPF_LUMINANCE)) {
					if(bc==8)  {
						for(var i=0; i<img.length; i+=4) img[i+3] = data[offset+(i>>2)];
						offset+=(img.length>>2)
					}
					else throw "unknown bit count "+bc;
				}
				else {
					console.log("unknown texture format, head flags: ", head.flags.toString(2), "pixelFormat flags: ", pf.flags.toString(2));
					throw "e";
				}
				out.push({width:w, height:h, image:img.buffer});
				w = (w>>1);  h = (h>>1);
			}
			//console.log(Date.now()-time);  throw "e";
			return out; //out.slice(0,1);
		},
	
		encode : function(img, w, h)
		{
			var img = new Uint8Array(img);
			var aAnd = 255;
			for(var i=3; i<img.length; i+=4) aAnd &= img[i];
			var gotAlpha = aAnd<250;
			
			var data = new Uint8Array(124+(w*h*2)), offset = 0;
			UTEX.U.writeASCII(data, offset, "DDS ");                offset+=  4;
			UTEX.DDS.writeHeader(data, w, h, gotAlpha, offset);  offset+=124;
			
			var mcnt = 0;
			while(w*h!=0) {
				if(gotAlpha) offset = UTEX.writeBC3(img, w, h, data, offset);
				else         offset = UTEX.writeBC1(img, w, h, data, offset);
				img = UTEX.mipmapB(img, w, h);
				w = (w>>1);  h = (h>>1);
				mcnt++;
			}
			data[28] = mcnt;
			
			return data.buffer.slice(0, offset);
		},
	
		readHeader : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			offset+=4;	// size = 124
			hd.flags    = rUi(data, offset);  offset+=4;
			hd.height   = rUi(data, offset);  offset+=4;
			hd.width    = rUi(data, offset);  offset+=4;
			hd.pitch    = rUi(data, offset);  offset+=4;
			hd.depth    = rUi(data, offset);  offset+=4;
			hd.mmcount  = rUi(data, offset);  offset+=4;
			offset+=11*4;	// reserved, zeros
			hd.pixFormat= UTEX.DDS.readPixFormat(data, offset);  offset+=32;
			hd.caps     = rUi(data, offset);  offset+=4;
			hd.caps2    = rUi(data, offset);  offset+=4;
			hd.caps3    = rUi(data, offset);  offset+=4;
			hd.caps4    = rUi(data, offset);  offset+=4;
			offset+=4;  // reserved, zeros
			return hd;
		},
		writeHeader : function(data, w,h, gotAlpha, offset)
		{
			var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
			var flgs = C.DDSD_CAPS | C.DDSD_HEIGHT | C.DDSD_WIDTH | C.DDSD_PIXELFORMAT;
			flgs |= C.DDSD_MIPMAPCOUNT | C.DDSD_LINEARSIZE;
			
			var caps = C.DDSCAPS_COMPLEX | C.DDSCAPS_MIPMAP | C.DDSCAPS_TEXTURE;
			var pitch = ((w*h)>>1)*(gotAlpha?2:1), depth = gotAlpha ? 1 : 0;
			
			wUi(data, offset,    124);  offset+=4;
			wUi(data, offset,   flgs);  offset+=4;  // flags
			wUi(data, offset,      h);  offset+=4;
			wUi(data, offset,      w);  offset+=4;
			wUi(data, offset,  pitch);  offset+=4;
			wUi(data, offset,  depth);  offset+=4;
			wUi(data, offset,     10);  offset+=4;
			offset+=11*4;
			UTEX.DDS.writePixFormat(data, gotAlpha, offset);  offset+=32;
			wUi(data, offset,   caps);  offset+=4;  // caps
			offset += 4*4;
		},
	
		readPixFormat : function(data, offset) 
		{
			var pf = {}, rUi = UTEX.U.readUintLE;
			offset+=4;  // size = 32
			pf.flags    = rUi(data, offset);  offset+=4;
			pf.fourCC   = UTEX.U.readASCII(data, offset,4);  offset+=4;
			pf.bitCount = rUi(data, offset);  offset+=4;
			pf.RMask    = rUi(data, offset);  offset+=4;
			pf.GMask    = rUi(data, offset);  offset+=4;
			pf.BMask    = rUi(data, offset);  offset+=4;
			pf.AMask    = rUi(data, offset);  offset+=4;
			return pf;
		},
		writePixFormat : function(data, gotAlpha, offset)
		{
			var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
			var flgs = C.DDPF_FOURCC;
			
			wUi(data, offset,   32); offset+=4;
			wUi(data, offset, flgs); offset+=4;
			UTEX.U.writeASCII(data, offset, gotAlpha?"DXT5":"DXT1");  offset+=4;
			offset+=5*4;
		},
	
		readHeader10 : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			
			hd.format   = rUi(data, offset);  offset+=4;
			hd.dimension= rUi(data, offset);  offset+=4;
			hd.miscFlags= rUi(data, offset);  offset+=4;
			hd.arraySize= rUi(data, offset);  offset+=4;
			hd.miscFlags2=rUi(data, offset);  offset+=4;
			
			return hd;
		}
	}
	
	UTEX.PVR = {
		decode : function(buff)
		{
			var data = new Uint8Array(buff), offset = 0;
			var head = UTEX.PVR.readHeader(data, offset);  offset+=52;
			//var ooff = offset;
			//console.log(PUtils.readByteArray(data, offset, 10))
			offset += head.mdsize;
			
			console.log(head);
			
			var w = head.width, h = head.height;
			var img = new Uint8Array(h*w*4);
			
			var pf = head.pf0;
			if(pf==0) {
				for(var y=0; y<h; y++)
					for(var x=0; x<w; x++)
					{
						var i = y*w+x, qi = i<<2, bi = i<<1;
						
						//img[qi+0]=((data[offset+(bi>>3)]>>(bi&7))&3)*85;
						img[qi+3]=255;
					}
			}
			else console.log("Unknown pixel format: "+pf);
			
			return [{width:w, height:h, image:img.buffer}]
		},
		readHeader : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			hd.version  = rUi(data, offset);  offset+=4;
			hd.flags    = rUi(data, offset);  offset+=4;
			hd.pf0      = rUi(data, offset);  offset+=4;
			hd.pf1      = rUi(data, offset);  offset+=4;
			hd.cspace   = rUi(data, offset);  offset+=4;
			hd.ctype    = rUi(data, offset);  offset+=4;
			hd.height   = rUi(data, offset);  offset+=4;
			hd.width    = rUi(data, offset);  offset+=4;
			hd.sfnum     = rUi(data, offset);  offset+=4;
			hd.fcnum     = rUi(data, offset);  offset+=4;
			hd.mmcount  = rUi(data, offset);  offset+=4;
			hd.mdsize   = rUi(data, offset);  offset+=4;
			return hd;
		}
	}



;(function(){
var UTIF = {};

// Make available for import by `require()`
if (typeof module == "object") {module.exports = UTIF;}
else {self.UTIF = UTIF;}

var pako = (typeof require === "function") ? require("pako") : self.pako;

function log() { if (typeof process=="undefined" || process.env.NODE_ENV=="development") console.log.apply(console, arguments);  }

(function(UTIF, pako){
	
// Following lines add a JPEG decoder  to UTIF.JpegDecoder
(function(){var V="function"===typeof Symbol&&"symbol"===typeof Symbol.iterator?function(g){return typeof g}:function(g){return g&&"function"===typeof Symbol&&g.constructor===Symbol&&g!==Symbol.prototype?"symbol":typeof g},D=function(){function g(g){this.message="JPEG error: "+g}g.prototype=Error();g.prototype.name="JpegError";return g.constructor=g}(),P=function(){function g(g,D){this.message=g;this.g=D}g.prototype=Error();g.prototype.name="DNLMarkerError";return g.constructor=g}();(function(){function g(){this.M=
null;this.B=-1}function W(a,d){for(var f=0,e=[],b,B,k=16;0<k&&!a[k-1];)k--;e.push({children:[],index:0});var l=e[0],r;for(b=0;b<k;b++){for(B=0;B<a[b];B++){l=e.pop();for(l.children[l.index]=d[f];0<l.index;)l=e.pop();l.index++;for(e.push(l);e.length<=b;)e.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r;f++}b+1<k&&(e.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r)}return e[0].children}function X(a,d,f,e,b,B,k,l,r){function n(){if(0<x)return x--,z>>x&1;z=a[d++];if(255===
z){var c=a[d++];if(c){if(220===c&&g){d+=2;var b=a[d++]<<8|a[d++];if(0<b&&b!==f.g)throw new P("Found DNL marker (0xFFDC) while parsing scan data",b);}throw new D("unexpected marker "+(z<<8|c).toString(16));}}x=7;return z>>>7}function q(a){for(;;){a=a[n()];if("number"===typeof a)return a;if("object"!==("undefined"===typeof a?"undefined":V(a)))throw new D("invalid huffman sequence");}}function h(a){for(var c=0;0<a;)c=c<<1|n(),a--;return c}function c(a){if(1===a)return 1===n()?1:-1;var c=h(a);return c>=
1<<a-1?c:c+(-1<<a)+1}function C(a,b){var d=q(a.D);d=0===d?0:c(d);a.a[b]=a.m+=d;for(d=1;64>d;){var h=q(a.o),k=h&15;h>>=4;if(0===k){if(15>h)break;d+=16}else d+=h,a.a[b+J[d]]=c(k),d++}}function w(a,d){var b=q(a.D);b=0===b?0:c(b)<<r;a.a[d]=a.m+=b}function p(a,c){a.a[c]|=n()<<r}function m(a,b){if(0<A)A--;else for(var d=B;d<=k;){var e=q(a.o),f=e&15;e>>=4;if(0===f){if(15>e){A=h(e)+(1<<e)-1;break}d+=16}else d+=e,a.a[b+J[d]]=c(f)*(1<<r),d++}}function t(a,d){for(var b=B,e=0,f;b<=k;){f=d+J[b];var l=0>a.a[f]?
-1:1;switch(E){case 0:e=q(a.o);f=e&15;e>>=4;if(0===f)15>e?(A=h(e)+(1<<e),E=4):(e=16,E=1);else{if(1!==f)throw new D("invalid ACn encoding");Q=c(f);E=e?2:3}continue;case 1:case 2:a.a[f]?a.a[f]+=l*(n()<<r):(e--,0===e&&(E=2===E?3:0));break;case 3:a.a[f]?a.a[f]+=l*(n()<<r):(a.a[f]=Q<<r,E=0);break;case 4:a.a[f]&&(a.a[f]+=l*(n()<<r))}b++}4===E&&(A--,0===A&&(E=0))}var g=9<arguments.length&&void 0!==arguments[9]?arguments[9]:!1,u=f.P,v=d,z=0,x=0,A=0,E=0,Q,K=e.length,F,L,M,I;var R=f.S?0===B?0===l?w:p:0===l?
m:t:C;var G=0;var O=1===K?e[0].c*e[0].l:u*f.O;for(var S,T;G<O;){var U=b?Math.min(O-G,b):O;for(F=0;F<K;F++)e[F].m=0;A=0;if(1===K){var y=e[0];for(I=0;I<U;I++)R(y,64*((y.c+1)*(G/y.c|0)+G%y.c)),G++}else for(I=0;I<U;I++){for(F=0;F<K;F++)for(y=e[F],S=y.h,T=y.j,L=0;L<T;L++)for(M=0;M<S;M++)R(y,64*((y.c+1)*((G/u|0)*y.j+L)+(G%u*y.h+M)));G++}x=0;(y=N(a,d))&&y.f&&((0,_util.warn)("decodeScan - unexpected MCU data, current marker is: "+y.f),d=y.offset);y=y&&y.F;if(!y||65280>=y)throw new D("marker was not found");
if(65488<=y&&65495>=y)d+=2;else break}(y=N(a,d))&&y.f&&((0,_util.warn)("decodeScan - unexpected Scan data, current marker is: "+y.f),d=y.offset);return d-v}function Y(a,d){for(var f=d.c,e=d.l,b=new Int16Array(64),B=0;B<e;B++)for(var k=0;k<f;k++){var l=64*((d.c+1)*B+k),r=b,n=d.G,q=d.a;if(!n)throw new D("missing required Quantization Table.");for(var h=0;64>h;h+=8){var c=q[l+h];var C=q[l+h+1];var w=q[l+h+2];var p=q[l+h+3];var m=q[l+h+4];var t=q[l+h+5];var g=q[l+h+6];var u=q[l+h+7];c*=n[h];if(0===(C|
w|p|m|t|g|u))c=5793*c+512>>10,r[h]=c,r[h+1]=c,r[h+2]=c,r[h+3]=c,r[h+4]=c,r[h+5]=c,r[h+6]=c,r[h+7]=c;else{C*=n[h+1];w*=n[h+2];p*=n[h+3];m*=n[h+4];t*=n[h+5];g*=n[h+6];u*=n[h+7];var v=5793*c+128>>8;var z=5793*m+128>>8;var x=w;var A=g;m=2896*(C-u)+128>>8;u=2896*(C+u)+128>>8;p<<=4;t<<=4;v=v+z+1>>1;z=v-z;c=3784*x+1567*A+128>>8;x=1567*x-3784*A+128>>8;A=c;m=m+t+1>>1;t=m-t;u=u+p+1>>1;p=u-p;v=v+A+1>>1;A=v-A;z=z+x+1>>1;x=z-x;c=2276*m+3406*u+2048>>12;m=3406*m-2276*u+2048>>12;u=c;c=799*p+4017*t+2048>>12;p=4017*
p-799*t+2048>>12;t=c;r[h]=v+u;r[h+7]=v-u;r[h+1]=z+t;r[h+6]=z-t;r[h+2]=x+p;r[h+5]=x-p;r[h+3]=A+m;r[h+4]=A-m}}for(n=0;8>n;++n)c=r[n],C=r[n+8],w=r[n+16],p=r[n+24],m=r[n+32],t=r[n+40],g=r[n+48],u=r[n+56],0===(C|w|p|m|t|g|u)?(c=5793*c+8192>>14,c=-2040>c?0:2024<=c?255:c+2056>>4,q[l+n]=c,q[l+n+8]=c,q[l+n+16]=c,q[l+n+24]=c,q[l+n+32]=c,q[l+n+40]=c,q[l+n+48]=c,q[l+n+56]=c):(v=5793*c+2048>>12,z=5793*m+2048>>12,x=w,A=g,m=2896*(C-u)+2048>>12,u=2896*(C+u)+2048>>12,v=(v+z+1>>1)+4112,z=v-z,c=3784*x+1567*A+2048>>
12,x=1567*x-3784*A+2048>>12,A=c,m=m+t+1>>1,t=m-t,u=u+p+1>>1,p=u-p,v=v+A+1>>1,A=v-A,z=z+x+1>>1,x=z-x,c=2276*m+3406*u+2048>>12,m=3406*m-2276*u+2048>>12,u=c,c=799*p+4017*t+2048>>12,p=4017*p-799*t+2048>>12,t=c,c=v+u,u=v-u,C=z+t,g=z-t,w=x+p,t=x-p,p=A+m,m=A-m,c=16>c?0:4080<=c?255:c>>4,C=16>C?0:4080<=C?255:C>>4,w=16>w?0:4080<=w?255:w>>4,p=16>p?0:4080<=p?255:p>>4,m=16>m?0:4080<=m?255:m>>4,t=16>t?0:4080<=t?255:t>>4,g=16>g?0:4080<=g?255:g>>4,u=16>u?0:4080<=u?255:u>>4,q[l+n]=c,q[l+n+8]=C,q[l+n+16]=w,q[l+n+24]=
p,q[l+n+32]=m,q[l+n+40]=t,q[l+n+48]=g,q[l+n+56]=u)}return d.a}function N(a,d){var f=2<arguments.length&&void 0!==arguments[2]?arguments[2]:d,e=a.length-1;f=f<d?f:d;if(d>=e)return null;var b=a[d]<<8|a[d+1];if(65472<=b&&65534>=b)return{f:null,F:b,offset:d};for(var B=a[f]<<8|a[f+1];!(65472<=B&&65534>=B);){if(++f>=e)return null;B=a[f]<<8|a[f+1]}return{f:b.toString(16),F:B,offset:f}}var J=new Uint8Array([0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,
57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]);g.prototype={parse:function(a){function d(){var d=a[k]<<8|a[k+1];k+=2;return d}function f(){var b=d();b=k+b-2;var c=N(a,b,k);c&&c.f&&((0,_util.warn)("readDataBlock - incorrect length, current marker is: "+c.f),b=c.offset);b=a.subarray(k,b);k+=b.length;return b}function e(a){for(var b=Math.ceil(a.v/8/a.s),c=Math.ceil(a.g/8/a.u),d=0;d<a.b.length;d++){v=a.b[d];var e=Math.ceil(Math.ceil(a.v/8)*v.h/a.s),f=Math.ceil(Math.ceil(a.g/
8)*v.j/a.u);v.a=new Int16Array(64*c*v.j*(b*v.h+1));v.c=e;v.l=f}a.P=b;a.O=c}var b=(1<arguments.length&&void 0!==arguments[1]?arguments[1]:{}).N,B=void 0===b?null:b,k=0,l=null,r=0;b=[];var n=[],q=[],h=d();if(65496!==h)throw new D("SOI not found");for(h=d();65497!==h;){switch(h){case 65504:case 65505:case 65506:case 65507:case 65508:case 65509:case 65510:case 65511:case 65512:case 65513:case 65514:case 65515:case 65516:case 65517:case 65518:case 65519:case 65534:var c=f();65518===h&&65===c[0]&&100===
c[1]&&111===c[2]&&98===c[3]&&101===c[4]&&(l={version:c[5]<<8|c[6],Y:c[7]<<8|c[8],Z:c[9]<<8|c[10],W:c[11]});break;case 65499:h=d()+k-2;for(var g;k<h;){var w=a[k++],p=new Uint16Array(64);if(0===w>>4)for(c=0;64>c;c++)g=J[c],p[g]=a[k++];else if(1===w>>4)for(c=0;64>c;c++)g=J[c],p[g]=d();else throw new D("DQT - invalid table spec");b[w&15]=p}break;case 65472:case 65473:case 65474:if(m)throw new D("Only single frame JPEGs supported");d();var m={};m.X=65473===h;m.S=65474===h;m.precision=a[k++];h=d();m.g=
B||h;m.v=d();m.b=[];m.C={};c=a[k++];for(h=p=w=0;h<c;h++){g=a[k];var t=a[k+1]>>4;var H=a[k+1]&15;w<t&&(w=t);p<H&&(p=H);t=m.b.push({h:t,j:H,T:a[k+2],G:null});m.C[g]=t-1;k+=3}m.s=w;m.u=p;e(m);break;case 65476:g=d();for(h=2;h<g;){w=a[k++];p=new Uint8Array(16);for(c=t=0;16>c;c++,k++)t+=p[c]=a[k];H=new Uint8Array(t);for(c=0;c<t;c++,k++)H[c]=a[k];h+=17+t;(0===w>>4?q:n)[w&15]=W(p,H)}break;case 65501:d();var u=d();break;case 65498:c=1===++r&&!B;d();w=a[k++];g=[];for(h=0;h<w;h++){p=m.C[a[k++]];var v=m.b[p];
p=a[k++];v.D=q[p>>4];v.o=n[p&15];g.push(v)}h=a[k++];w=a[k++];p=a[k++];try{var z=X(a,k,m,g,u,h,w,p>>4,p&15,c);k+=z}catch(x){if(x instanceof P)return(0,_util.warn)('Attempting to re-parse JPEG image using "scanLines" parameter found in DNL marker (0xFFDC) segment.'),this.parse(a,{N:x.g});throw x;}break;case 65500:k+=4;break;case 65535:255!==a[k]&&k--;break;default:if(255===a[k-3]&&192<=a[k-2]&&254>=a[k-2])k-=3;else if((c=N(a,k-2))&&c.f)(0,_util.warn)("JpegImage.parse - unexpected data, current marker is: "+
c.f),k=c.offset;else throw new D("unknown marker "+h.toString(16));}h=d()}this.width=m.v;this.height=m.g;this.A=l;this.b=[];for(h=0;h<m.b.length;h++){v=m.b[h];if(u=b[v.T])v.G=u;this.b.push({R:Y(m,v),U:v.h/m.s,V:v.j/m.u,c:v.c,l:v.l})}this.i=this.b.length},L:function(a,d){var f=this.width/a,e=this.height/d,b,g,k=this.b.length,l=a*d*k,r=new Uint8ClampedArray(l),n=new Uint32Array(a);for(g=0;g<k;g++){var q=this.b[g];var h=q.U*f;var c=q.V*e;var C=g;var w=q.R;var p=q.c+1<<3;for(b=0;b<a;b++)q=0|b*h,n[b]=
(q&4294967288)<<3|q&7;for(h=0;h<d;h++)for(q=0|h*c,q=p*(q&4294967288)|(q&7)<<3,b=0;b<a;b++)r[C]=w[q+n[b]],C+=k}if(e=this.M)for(g=0;g<l;)for(f=q=0;q<k;q++,g++,f+=2)r[g]=(r[g]*e[f]>>8)+e[f+1];return r},w:function(){return this.A?!!this.A.W:3===this.i?0===this.B?!1:!0:1===this.B?!0:!1},I:function(a){for(var d,f,e,b=0,g=a.length;b<g;b+=3)d=a[b],f=a[b+1],e=a[b+2],a[b]=d-179.456+1.402*e,a[b+1]=d+135.459-.344*f-.714*e,a[b+2]=d-226.816+1.772*f;return a},K:function(a){for(var d,f,e,b,g=0,k=0,l=a.length;k<l;k+=
4)d=a[k],f=a[k+1],e=a[k+2],b=a[k+3],a[g++]=-122.67195406894+f*(-6.60635669420364E-5*f+4.37130475926232E-4*e-5.4080610064599E-5*d+4.8449797120281E-4*b-.154362151871126)+e*(-9.57964378445773E-4*e+8.17076911346625E-4*d-.00477271405408747*b+1.53380253221734)+d*(9.61250184130688E-4*d-.00266257332283933*b+.48357088451265)+b*(-3.36197177618394E-4*b+.484791561490776),a[g++]=107.268039397724+f*(2.19927104525741E-5*f-6.40992018297945E-4*e+6.59397001245577E-4*d+4.26105652938837E-4*b-.176491792462875)+e*(-7.78269941513683E-4*
e+.00130872261408275*d+7.70482631801132E-4*b-.151051492775562)+d*(.00126935368114843*d-.00265090189010898*b+.25802910206845)+b*(-3.18913117588328E-4*b-.213742400323665),a[g++]=-20.810012546947+f*(-5.70115196973677E-4*f-2.63409051004589E-5*e+.0020741088115012*d-.00288260236853442*b+.814272968359295)+e*(-1.53496057440975E-5*e-1.32689043961446E-4*d+5.60833691242812E-4*b-.195152027534049)+d*(.00174418132927582*d-.00255243321439347*b+.116935020465145)+b*(-3.43531996510555E-4*b+.24165260232407);return a.subarray(0,
g)},J:function(a){for(var d,f,e,b=0,g=a.length;b<g;b+=4)d=a[b],f=a[b+1],e=a[b+2],a[b]=434.456-d-1.402*e,a[b+1]=119.541-d+.344*f+.714*e,a[b+2]=481.816-d-1.772*f;return a},H:function(a){for(var d,f,e,b,g=0,k=1/255,l=0,r=a.length;l<r;l+=4)d=a[l]*k,f=a[l+1]*k,e=a[l+2]*k,b=a[l+3]*k,a[g++]=255+d*(-4.387332384609988*d+54.48615194189176*f+18.82290502165302*e+212.25662451639585*b-285.2331026137004)+f*(1.7149763477362134*f-5.6096736904047315*e-17.873870861415444*b-5.497006427196366)+e*(-2.5217340131683033*
e-21.248923337353073*b+17.5119270841813)-b*(21.86122147463605*b+189.48180835922747),a[g++]=255+d*(8.841041422036149*d+60.118027045597366*f+6.871425592049007*e+31.159100130055922*b-79.2970844816548)+f*(-15.310361306967817*f+17.575251261109482*e+131.35250912493976*b-190.9453302588951)+e*(4.444339102852739*e+9.8632861493405*b-24.86741582555878)-b*(20.737325471181034*b+187.80453709719578),a[g++]=255+d*(.8842522430003296*d+8.078677503112928*f+30.89978309703729*e-.23883238689178934*b-14.183576799673286)+
f*(10.49593273432072*f+63.02378494754052*e+50.606957656360734*b-112.23884253719248)+e*(.03296041114873217*e+115.60384449646641*b-193.58209356861505)-b*(22.33816807309886*b+180.12613974708367);return a.subarray(0,g)},getData:function(a,d,f){if(4<this.i)throw new D("Unsupported color mode");a=this.L(a,d);if(1===this.i&&f){f=a.length;d=new Uint8ClampedArray(3*f);for(var e=0,b=0;b<f;b++){var g=a[b];d[e++]=g;d[e++]=g;d[e++]=g}return d}if(3===this.i&&this.w())return this.I(a);if(4===this.i){if(this.w())return f?
this.K(a):this.J(a);if(f)return this.H(a)}return a}}; UTIF.JpegDecoder=g})()})();

//UTIF.JpegDecoder = PDFJS.JpegImage;


UTIF.encodeImage = function(rgba, w, h, metadata)
{
	var idf = { "t256":[w], "t257":[h], "t258":[8,8,8,8], "t259":[1], "t262":[2], "t273":[1000], // strips offset
				"t277":[4], "t278":[h], /* rows per strip */          "t279":[w*h*4], // strip byte counts
				"t282":[[72,1]], "t283":[[72,1]], "t284":[1], "t286":[[0,1]], "t287":[[0,1]], "t296":[1], "t305": ["Photopea (UTIF.js)"], "t338":[1]
		};
	if (metadata) for (var i in metadata) idf[i] = metadata[i];
	
	var prfx = new Uint8Array(UTIF.encode([idf]));
	var img = new Uint8Array(rgba);
	var data = new Uint8Array(1000+w*h*4);
	for(var i=0; i<prfx.length; i++) data[i] = prfx[i];
	for(var i=0; i<img .length; i++) data[1000+i] = img[i];
	return data.buffer;
}

UTIF.encode = function(ifds)
{
	var LE = false;
	var data = new Uint8Array(20000), offset = 4, bin = LE ? UTIF._binLE : UTIF._binBE;
	data[0]=data[1]=LE?73:77;  bin.writeUshort(data,2,42);

	var ifdo = 8;
	bin.writeUint(data, offset, ifdo);  offset+=4;
	for(var i=0; i<ifds.length; i++)
	{
		var noffs = UTIF._writeIFD(bin, UTIF._types.basic, data, ifdo, ifds[i]);
		ifdo = noffs[1];
		if(i<ifds.length-1) {
			if((ifdo&3)!=0) ifdo+=(4-(ifdo&3));  // make each IFD start at multiple of 4
			bin.writeUint(data, noffs[0], ifdo);
		}
	}
	return data.slice(0, ifdo).buffer;
}

UTIF.decode = function(buff, prm)
{
	if(prm==null) prm = {parseMN:true, debug:false};  // read MakerNote, debug
	var data = new Uint8Array(buff), offset = 0;

	var id = UTIF._binBE.readASCII(data, offset, 2);  offset+=2;
	var bin = id=="II" ? UTIF._binLE : UTIF._binBE;
	var num = bin.readUshort(data, offset);  offset+=2;

	var ifdo = bin.readUint(data, offset);  offset+=4;
	var ifds = [];
	while(true) {
		var noff = UTIF._readIFD(bin, data, ifdo, ifds, 0, prm);
		ifdo = bin.readUint(data, noff);
		if(ifdo==0 || noff==0) break;
	}
	return ifds;
}

UTIF.decodeImage = function(buff, img, ifds)
{
	var data = new Uint8Array(buff);
	var id = UTIF._binBE.readASCII(data, 0, 2);

	if(img["t256"]==null) return;	// No width => probably not an image
	img.isLE = id=="II";
	img.width  = img["t256"][0];  //delete img["t256"];
	img.height = img["t257"][0];  //delete img["t257"];

	var cmpr   = img["t259"] ? img["t259"][0] : 1;  //delete img["t259"];
	var fo = img["t266"] ? img["t266"][0] : 1;  //delete img["t266"];
	if(img["t284"] && img["t284"][0]==2) log("PlanarConfiguration 2 should not be used!");

	var bipp;  // bits per pixel
	if(img["t258"]) bipp = Math.min(32,img["t258"][0])*img["t258"].length;
	else            bipp = (img["t277"]?img["t277"][0]:1);  
	// Some .NEF files have t258==14, even though they use 16 bits per pixel
	if(cmpr==1 && img["t279"]!=null && img["t278"] && img["t262"][0]==32803)  {
		bipp = Math.round((img["t279"][0]*8)/(img.width*img["t278"][0]));
	}
	var bipl = Math.ceil(img.width*bipp/8)*8;
	var soff = img["t273"];  if(soff==null) soff = img["t324"];
	var bcnt = img["t279"];  if(cmpr==1 && soff.length==1) bcnt = [img.height*(bipl>>>3)];  if(bcnt==null) bcnt = img["t325"];
	var bytes = new Uint8Array(img.height*(bipl>>>3)), bilen = 0;

	if(img["t322"]!=null) // tiled
	{
		var tw = img["t322"][0], th = img["t323"][0];
		var tx = Math.floor((img.width  + tw - 1) / tw);
		var ty = Math.floor((img.height + th - 1) / th);
		var tbuff = new Uint8Array(Math.ceil(tw*th*bipp/8)|0);
		for(var y=0; y<ty; y++)
			for(var x=0; x<tx; x++)
			{
				var i = y*tx+x;  for(var j=0; j<tbuff.length; j++) tbuff[j]=0;
				UTIF.decode._decompress(img,ifds, data, soff[i], bcnt[i], cmpr, tbuff, 0, fo);
				// Might be required for 7 too. Need to check
				if (cmpr==6) bytes = tbuff;
				else UTIF._copyTile(tbuff, Math.ceil(tw*bipp/8)|0, th, bytes, Math.ceil(img.width*bipp/8)|0, img.height, Math.ceil(x*tw*bipp/8)|0, y*th);
			}
		bilen = bytes.length*8;
	}
	else	// stripped
	{
		var rps = img["t278"] ? img["t278"][0] : img.height;   rps = Math.min(rps, img.height);
		for(var i=0; i<soff.length; i++)
		{
			UTIF.decode._decompress(img,ifds, data, soff[i], bcnt[i], cmpr, bytes, Math.ceil(bilen/8)|0, fo);
			bilen += bipl * rps;
		}
		bilen = Math.min(bilen, bytes.length*8);
	}
	img.data = new Uint8Array(bytes.buffer, 0, Math.ceil(bilen/8)|0);
}

UTIF.decode._decompress = function(img,ifds, data, off, len, cmpr, tgt, toff, fo)  // fill order
{
	//console.log("compression", cmpr);
	//var time = Date.now();
	if(false) {}
	else if(cmpr==1 || (len==tgt.length && cmpr!=32767)) for(var j=0; j<len; j++) tgt[toff+j] = data[off+j];
	else if(cmpr==3) UTIF.decode._decodeG3 (data, off, len, tgt, toff, img.width, fo, img["t292"]?((img["t292"][0]&1)==1):false);
	else if(cmpr==4) UTIF.decode._decodeG4 (data, off, len, tgt, toff, img.width, fo);
	else if(cmpr==5) UTIF.decode._decodeLZW(data, off, tgt, toff);
	else if(cmpr==6) UTIF.decode._decodeOldJPEG(img, data, off, len, tgt, toff);
	else if(cmpr==7) UTIF.decode._decodeNewJPEG(img, data, off, len, tgt, toff);
	else if(cmpr==8) {  var src = new Uint8Array(data.buffer,off,len);  var bin = pako["inflate"](src);  for(var i=0; i<bin.length; i++) tgt[toff+i]=bin[i];  }
	else if(cmpr==32767) UTIF.decode._decodeARW(img, data, off, len, tgt, toff);
	else if(cmpr==32773) UTIF.decode._decodePackBits(data, off, len, tgt, toff);
	else if(cmpr==32809) UTIF.decode._decodeThunder (data, off, len, tgt, toff);
	else if(cmpr==34713) //for(var j=0; j<len; j++) tgt[toff+j] = data[off+j];
		UTIF.decode._decodeNikon   (img,ifds, data, off, len, tgt, toff);
	else log("Unknown compression", cmpr);
	
	//console.log(Date.now()-time);
	
	var bps = (img["t258"]?Math.min(32,img["t258"][0]):1);
	var noc = (img["t277"]?img["t277"][0]:1), bpp=(bps*noc)>>>3, h = (img["t278"] ? img["t278"][0] : img.height), bpl = Math.ceil(bps*noc*img.width/8);
	
	// convert to Little Endian  /*
	if(bps==16 && !img.isLE && img["t33422"]==null)  // not DNG
		for(var y=0; y<h; y++) {
			//console.log("fixing endianity");
			var roff = toff+y*bpl;
			for(var x=1; x<bpl; x+=2) {  var t=tgt[roff+x];  tgt[roff+x]=tgt[roff+x-1];  tgt[roff+x-1]=t;  }
		}  //*/

	if(img["t317"] && img["t317"][0]==2)
	{
		for(var y=0; y<h; y++)
		{
			var ntoff = toff+y*bpl;
			if(bps==16) for(var j=bpp; j<bpl; j+=2) {
				var nv = ((tgt[ntoff+j+1]<<8)|tgt[ntoff+j])  +  ((tgt[ntoff+j-bpp+1]<<8)|tgt[ntoff+j-bpp]);
				tgt[ntoff+j] = nv&255;  tgt[ntoff+j+1] = (nv>>>8)&255;  
			}
			else if(noc==3) for(var j=  3; j<bpl; j+=3)
			{
				tgt[ntoff+j  ] = (tgt[ntoff+j  ] + tgt[ntoff+j-3])&255;
				tgt[ntoff+j+1] = (tgt[ntoff+j+1] + tgt[ntoff+j-2])&255;
				tgt[ntoff+j+2] = (tgt[ntoff+j+2] + tgt[ntoff+j-1])&255;
			}
			else for(var j=bpp; j<bpl; j++) tgt[ntoff+j] = (tgt[ntoff+j] + tgt[ntoff+j-bpp])&255;
		}
	}
}

UTIF.decode._ljpeg_diff = function(data, prm, huff) {
	var getbithuff   = UTIF.decode._getbithuff;
	var len, diff;
	len  = getbithuff(data, prm, huff[0], huff);
	diff = getbithuff(data, prm, len, 0);
	if ((diff & (1 << (len-1))) == 0)  diff -= (1 << len) - 1;
	return diff;
}
UTIF.decode._decodeARW = function(img, inp, off, src_length, tgt, toff) {
	var raw_width = img["t256"][0], height=img["t257"][0], tiff_bps=img["t258"][0];
	var bin=(img.isLE ? UTIF._binLE : UTIF._binBE);
	//console.log(raw_width, height, tiff_bps, raw_width*height, src_length);
	var arw2 = (raw_width*height == src_length) || (raw_width*height*1.5 == src_length);
	//arw2 = true;
	//console.log("ARW2: ", arw2, raw_width*height, src_length, tgt.length);
	if(!arw2) {  //"sony_arw_load_raw"; // not arw2
		height+=8;
		var prm = [off,0,0,0];
		var huff = new Uint16Array(32770);
		var tab = [ 0xf11,0xf10,0xe0f,0xd0e,0xc0d,0xb0c,0xa0b,0x90a,0x809,
			0x708,0x607,0x506,0x405,0x304,0x303,0x300,0x202,0x201 ];
		var i, c, n, col, row, sum=0;
		var ljpeg_diff = UTIF.decode._ljpeg_diff;

		huff[0] = 15;
		for (n=i=0; i < 18; i++) {
			var lim = 32768 >>> (tab[i] >>> 8);
			for(var c=0; c<lim; c++) huff[++n] = tab[i];
		}
		for (col = raw_width; col--; )
			for (row=0; row < height+1; row+=2) {
				if (row == height) row = 1;
				sum += ljpeg_diff(inp, prm, huff);
				if (row < height) {
					var clr =  (sum)&4095;
					UTIF.decode._putsF(tgt, (row*raw_width+col)*tiff_bps, clr<<(16-tiff_bps));
				}
			}
		return;
	}
	if(raw_width*height*1.5==src_length) {
		//console.log("weird compression");
		for(var i=0; i<src_length; i+=3) {  var b0=inp[off+i+0], b1=inp[off+i+1], b2=inp[off+i+2];  
			tgt[toff+i]=(b1<<4)|(b0>>>4);  tgt[toff+i+1]=(b0<<4)|(b2>>>4);  tgt[toff+i+2]=(b2<<4)|(b1>>>4);  }
		return;
	}
	
	var pix = new Uint16Array(16);
	var row, col, val, max, min, imax, imin, sh, bit, i,    dp;
	
	var data = new Uint8Array(raw_width+1);
	for (row=0; row < height; row++) {
		//fread (data, 1, raw_width, ifp);
		for(var j=0; j<raw_width; j++) data[j]=inp[off++];
		for (dp=0, col=0; col < raw_width-30; dp+=16) {
			max  = 0x7ff & (val = bin.readUint(data,dp));
			min  = 0x7ff & (val >>> 11);
			imax = 0x0f & (val >>> 22);
			imin = 0x0f & (val >>> 26);
			for (sh=0; sh < 4 && 0x80 << sh <= max-min; sh++);
			for (bit=30, i=0; i < 16; i++)
				if      (i == imax) pix[i] = max;
				else if (i == imin) pix[i] = min;
				else {
					pix[i] = ((bin.readUshort(data, dp+(bit >> 3)) >>> (bit & 7) & 0x7f) << sh) + min;
					if (pix[i] > 0x7ff) pix[i] = 0x7ff;
					bit += 7;
				}
			for (i=0; i < 16; i++, col+=2) {
				//RAW(row,col) = curve[pix[i] << 1] >> 2;
				var clr =  pix[i]<<1;   //clr = 0xffff;
				UTIF.decode._putsF(tgt, (row*raw_width+col)*tiff_bps, clr<<(16-tiff_bps));
			}
			col -= col & 1 ? 1:31;
		}
	}
}

UTIF.decode._decodeNikon = function(img,imgs, data, off, src_length, tgt, toff)
{
	var nikon_tree = [
    [ 0, 0,1,5,1,1,1,1,1,1,2,0,0,0,0,0,0,	/* 12-bit lossy */
      5,4,3,6,2,7,1,0,8,9,11,10,12 ],
    [ 0, 0,1,5,1,1,1,1,1,1,2,0,0,0,0,0,0,	/* 12-bit lossy after split */
      0x39,0x5a,0x38,0x27,0x16,5,4,3,2,1,0,11,12,12 ],
    [ 0, 0,1,4,2,3,1,2,0,0,0,0,0,0,0,0,0,  /* 12-bit lossless */
      5,4,6,3,7,2,8,1,9,0,10,11,12 ],
    [ 0, 0,1,4,3,1,1,1,1,1,2,0,0,0,0,0,0,	/* 14-bit lossy */
      5,6,4,7,8,3,9,2,1,0,10,11,12,13,14 ],
    [ 0, 0,1,5,1,1,1,1,1,1,1,2,0,0,0,0,0,	/* 14-bit lossy after split */
      8,0x5c,0x4b,0x3a,0x29,7,6,5,4,3,2,1,0,13,14 ],
    [ 0, 0,1,4,2,2,3,1,2,0,0,0,0,0,0,0,0,	/* 14-bit lossless */
      7,6,8,5,9,4,10,3,11,12,2,0,1,13,14 ] ];
	  
	var raw_width = img["t256"][0], height=img["t257"][0], tiff_bps=img["t258"][0];
	
	var tree = 0, split = 0;
	var make_decoder = UTIF.decode._make_decoder;
	var getbithuff   = UTIF.decode._getbithuff;
	
	var mn = imgs[0].exifIFD.makerNote, md = mn["t150"]?mn["t150"]:mn["t140"], mdo=0;  //console.log(mn,md);
	//console.log(md[0].toString(16), md[1].toString(16), tiff_bps);
	var ver0 = md[mdo++], ver1 = md[mdo++];
	if (ver0 == 0x49 || ver1 == 0x58)  mdo+=2110;
	if (ver0 == 0x46) tree = 2;
	if (tiff_bps == 14) tree += 3;
	
	var vpred = [[0,0],[0,0]], bin=(img.isLE ? UTIF._binLE : UTIF._binBE);
	for(var i=0; i<2; i++) for(var j=0; j<2; j++) {  vpred[i][j] = bin.readShort(md,mdo);  mdo+=2;   }  // not sure here ... [i][j] or [j][i]
	//console.log(vpred);
	
	
	var max = 1 << tiff_bps & 0x7fff, step=0;
	var csize = bin.readShort(md,mdo);  mdo+=2;
	if (csize > 1) step = Math.floor(max / (csize-1));
	if (ver0 == 0x44 && ver1 == 0x20 && step > 0)  split = bin.readShort(md,562);
	
	
	var i;
	var row, col;
	var len, shl, diff;
	var min_v = 0;
	var hpred = [0,0];
	var huff = make_decoder(nikon_tree[tree]);
	
	//var g_input_offset=0, bitbuf=0, vbits=0, reset=0;
	var prm = [off,0,0,0];
	//console.log(split);  split = 170;
	
	for (min_v=row=0; row < height; row++) {
		if (split && row == split) {
			//free (huff);
			huff = make_decoder (nikon_tree[tree+1]);
			//max_v += (min_v = 16) << 1;
		}
		for (col=0; col < raw_width; col++) {
			i = getbithuff(data,prm,huff[0],huff);
			len = i  & 15;
			shl = i >>> 4;
			diff = (((getbithuff(data,prm,len-shl,0) << 1) + 1) << shl) >>> 1;
			if ((diff & (1 << (len-1))) == 0)
				diff -= (1 << len) - (shl==0?1:0);
			if (col < 2) hpred[col] = vpred[row & 1][col] += diff;
			else         hpred[col & 1] += diff;
			
			var clr = Math.min(Math.max(hpred[col & 1],0),(1<<tiff_bps)-1);
			var bti = (row*raw_width+col)*tiff_bps;  
			UTIF.decode._putsF(tgt, bti, clr<<(16-tiff_bps));
		}
	}
}
// put 16 bits
UTIF.decode._putsF= function(dt, pos, val) {  val = val<<(8-(pos&7));  var o=(pos>>>3);  dt[o]|=val>>>16;  dt[o+1]|=val>>>8;  dt[o+2]|=val;  }


UTIF.decode._getbithuff = function(data,prm,nbits, huff) {
	var zero_after_ff = 0;
	var get_byte = UTIF.decode._get_byte;
	var c;
  
	var off=prm[0], bitbuf=prm[1], vbits=prm[2], reset=prm[3];

	//if (nbits > 25) return 0;
	//if (nbits <  0) return bitbuf = vbits = reset = 0;
	if (nbits == 0 || vbits < 0) return 0; 
	while (!reset && vbits < nbits && (c = data[off++]) != -1 &&
		!(reset = zero_after_ff && c == 0xff && data[off++])) {
		//console.log("byte read into c");
		bitbuf = (bitbuf << 8) + c;
		vbits += 8;
	} 
	c = (bitbuf << (32-vbits)) >>> (32-nbits);
	if (huff) {
		vbits -= huff[c+1] >>> 8;  //console.log(c, huff[c]>>8);
		c =  huff[c+1]&255;
	} else
		vbits -= nbits;
	if (vbits < 0) throw "e";
  
	prm[0]=off;  prm[1]=bitbuf;  prm[2]=vbits;  prm[3]=reset;
  
	return c;
}

UTIF.decode._make_decoder = function(source) {
	var max, len, h, i, j;
	var huff = [];

	for (max=16; max!=0 && !source[max]; max--);
	var si=17;
	
	huff[0] = max;
	for (h=len=1; len <= max; len++)
		for (i=0; i < source[len]; i++, ++si)
			for (j=0; j < 1 << (max-len); j++)
				if (h <= 1 << max)
					huff[h++] = (len << 8) | source[si];
	return huff;
}

UTIF.decode._decodeNewJPEG = function(img, data, off, len, tgt, toff)
{
	var tables = img["t347"], tlen = tables ? tables.length : 0, buff = new Uint8Array(tlen + len);
	
	if (tables) {
		var SOI = 216, EOI = 217, boff = 0;
		for (var i=0; i<(tlen-1); i++)
		{
			// Skip EOI marker from JPEGTables
			if (tables[i]==255 && tables[i+1]==EOI) break;
			buff[boff++] = tables[i];
		}

		// Skip SOI marker from data
		var byte1 = data[off], byte2 = data[off + 1];
		if (byte1!=255 || byte2!=SOI)
		{
			buff[boff++] = byte1;
			buff[boff++] = byte2;
		}
		for (var i=2; i<len; i++) buff[boff++] = data[off+i];
	}
	else for (var i=0; i<len; i++) buff[i] = data[off+i];

	if(img["t262"][0]==32803 || img["t262"][0]==34892) // lossless JPEG and lossy JPEG (used in DNG files)
	{
		var bps = img["t258"][0];//, dcdr = new LosslessJpegDecoder();
		var out = UTIF.LosslessJpegDecode(buff), olen=out.length;  //console.log(olen);
		
		if(false) {}
		else if(bps==16) {
			if(img.isLE) for(var i=0; i<olen; i++ ) {  tgt[toff+(i<<1)] = (out[i]&255);  tgt[toff+(i<<1)+1] = (out[i]>>>8);  }
			else         for(var i=0; i<olen; i++ ) {  tgt[toff+(i<<1)] = (out[i]>>>8);  tgt[toff+(i<<1)+1] = (out[i]&255);  }
		}
		else if(bps==14 || bps==12) {  // 4 * 14 == 56 == 7 * 8
			var rst = 16-bps;
			for(var i=0; i<olen; i++) UTIF.decode._putsF(tgt, i*bps, out[i]<<rst);
		}
		else throw new Error("unsupported bit depth "+bps);
	}
	else
	{
		var parser = new UTIF.JpegDecoder();  parser.parse(buff);
		var decoded = parser.getData(parser.width, parser.height);
		for (var i=0; i<decoded.length; i++) tgt[toff + i] = decoded[i];
	}

	// PhotometricInterpretation is 6 (YCbCr) for JPEG, but after decoding we populate data in
	// RGB format, so updating the tag value
	if(img["t262"][0] == 6)  img["t262"][0] = 2;
}

UTIF.decode._decodeOldJPEGInit = function(img, data, off, len)
{
	var SOI = 216, EOI = 217, DQT = 219, DHT = 196, DRI = 221, SOF0 = 192, SOS = 218;
	var joff = 0, soff = 0, tables, sosMarker, isTiled = false, i, j, k;
	var jpgIchgFmt    = img["t513"], jifoff = jpgIchgFmt ? jpgIchgFmt[0] : 0;
	var jpgIchgFmtLen = img["t514"], jiflen = jpgIchgFmtLen ? jpgIchgFmtLen[0] : 0;
	var soffTag       = img["t324"] || img["t273"] || jpgIchgFmt;
	var ycbcrss       = img["t530"], ssx = 0, ssy = 0;
	var spp           = img["t277"]?img["t277"][0]:1;
	var jpgresint     = img["t515"];

	if(soffTag)
	{
		soff = soffTag[0];
		isTiled = (soffTag.length > 1);
	}

	if(!isTiled)
	{
		if(data[off]==255 && data[off+1]==SOI) return { jpegOffset: off };
		if(jpgIchgFmt!=null)
		{
			if(data[off+jifoff]==255 && data[off+jifoff+1]==SOI) joff = off+jifoff;
			else log("JPEGInterchangeFormat does not point to SOI");

			if(jpgIchgFmtLen==null) log("JPEGInterchangeFormatLength field is missing");
			else if(jifoff >= soff || (jifoff+jiflen) <= soff) log("JPEGInterchangeFormatLength field value is invalid");

			if(joff != null) return { jpegOffset: joff };
		}
	}

	if(ycbcrss!=null) {  ssx = ycbcrss[0];  ssy = ycbcrss[1];  }

	if(jpgIchgFmt!=null)
		if(jpgIchgFmtLen!=null)
			if(jiflen >= 2 && (jifoff+jiflen) <= soff)
			{
				if(data[off+jifoff+jiflen-2]==255 && data[off+jifoff+jiflen-1]==SOI) tables = new Uint8Array(jiflen-2);
				else tables = new Uint8Array(jiflen);

				for(i=0; i<tables.length; i++) tables[i] = data[off+jifoff+i];
				log("Incorrect JPEG interchange format: using JPEGInterchangeFormat offset to derive tables");
			}
			else log("JPEGInterchangeFormat+JPEGInterchangeFormatLength > offset to first strip or tile");

	if(tables == null)
	{
		var ooff = 0, out = [];
		out[ooff++] = 255; out[ooff++] = SOI;

		var qtables = img["t519"];
		if(qtables==null) throw new Error("JPEGQTables tag is missing");
		for(i=0; i<qtables.length; i++)
		{
			out[ooff++] = 255; out[ooff++] = DQT; out[ooff++] = 0; out[ooff++] = 67; out[ooff++] = i;
			for(j=0; j<64; j++) out[ooff++] = data[off+qtables[i]+j];
		}

		for(k=0; k<2; k++)
		{
			var htables = img[(k == 0) ? "t520" : "t521"];
			if(htables==null) throw new Error(((k == 0) ? "JPEGDCTables" : "JPEGACTables") + " tag is missing");
			for(i=0; i<htables.length; i++)
			{
				out[ooff++] = 255; out[ooff++] = DHT;
				//out[ooff++] = 0; out[ooff++] = 67; out[ooff++] = i;
				var nc = 19;
				for(j=0; j<16; j++) nc += data[off+htables[i]+j];

				out[ooff++] = (nc >>> 8); out[ooff++] = nc & 255;
				out[ooff++] = (i | (k << 4));
				for(j=0; j<16; j++) out[ooff++] = data[off+htables[i]+j];
				for(j=0; j<nc; j++) out[ooff++] = data[off+htables[i]+16+j];
			}
		}

		out[ooff++] = 255; out[ooff++] = SOF0;
		out[ooff++] = 0;  out[ooff++] = 8 + 3*spp;  out[ooff++] = 8;
		out[ooff++] = (img.height >>> 8) & 255;  out[ooff++] = img.height & 255;
		out[ooff++] = (img.width  >>> 8) & 255;  out[ooff++] = img.width  & 255;
		out[ooff++] = spp;
		if(spp==1) {  out[ooff++] = 1;  out[ooff++] = 17;  out[ooff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			out[ooff++] = i + 1;
			out[ooff++] = (i != 0) ? 17 : (((ssx & 15) << 4) | (ssy & 15));
			out[ooff++] = i;
		}

		if(jpgresint!=null && jpgresint[0]!=0)
		{
			out[ooff++] = 255;  out[ooff++] = DRI;  out[ooff++] = 0;  out[ooff++] = 4;
			out[ooff++] = (jpgresint[0] >>> 8) & 255;
			out[ooff++] = jpgresint[0] & 255;
		}

		tables = new Uint8Array(out);
	}

	var sofpos = -1;
	i = 0;
	while(i < (tables.length - 1)) {
		if(tables[i]==255 && tables[i+1]==SOF0) {  sofpos = i; break;  }
		i++;
	}

	if(sofpos == -1)
	{
		var tmptab = new Uint8Array(tables.length + 10 + 3*spp);
		tmptab.set(tables);
		var tmpoff = tables.length;
		sofpos = tables.length;
		tables = tmptab;

		tables[tmpoff++] = 255; tables[tmpoff++] = SOF0;
		tables[tmpoff++] = 0;  tables[tmpoff++] = 8 + 3*spp;  tables[tmpoff++] = 8;
		tables[tmpoff++] = (img.height >>> 8) & 255;  tables[tmpoff++] = img.height & 255;
		tables[tmpoff++] = (img.width  >>> 8) & 255;  tables[tmpoff++] = img.width  & 255;
		tables[tmpoff++] = spp;
		if(spp==1) {  tables[tmpoff++] = 1;  tables[tmpoff++] = 17;  tables[tmpoff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			tables[tmpoff++] = i + 1;
			tables[tmpoff++] = (i != 0) ? 17 : (((ssx & 15) << 4) | (ssy & 15));
			tables[tmpoff++] = i;
		}
	}

	if(data[soff]==255 && data[soff+1]==SOS)
	{
		var soslen = (data[soff+2]<<8) | data[soff+3];
		sosMarker = new Uint8Array(soslen+2);
		sosMarker[0] = data[soff];  sosMarker[1] = data[soff+1]; sosMarker[2] = data[soff+2];  sosMarker[3] = data[soff+3];
		for(i=0; i<(soslen-2); i++) sosMarker[i+4] = data[soff+i+4];
	}
	else
	{
		sosMarker = new Uint8Array(2 + 6 + 2*spp);
		var sosoff = 0;
		sosMarker[sosoff++] = 255;  sosMarker[sosoff++] = SOS;
		sosMarker[sosoff++] = 0;  sosMarker[sosoff++] = 6 + 2*spp;  sosMarker[sosoff++] = spp;
		if(spp==1) {  sosMarker[sosoff++] = 1;  sosMarker[sosoff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			sosMarker[sosoff++] = i+1;  sosMarker[sosoff++] = (i << 4) | i;
		}
		sosMarker[sosoff++] = 0;  sosMarker[sosoff++] = 63;  sosMarker[sosoff++] = 0;
	}

	return { jpegOffset: off, tables: tables, sosMarker: sosMarker, sofPosition: sofpos };
}

UTIF.decode._decodeOldJPEG = function(img, data, off, len, tgt, toff)
{
	var i, dlen, tlen, buff, buffoff;
	var jpegData = UTIF.decode._decodeOldJPEGInit(img, data, off, len);

	if(jpegData.jpegOffset!=null)
	{
		dlen = off+len-jpegData.jpegOffset;
		buff = new Uint8Array(dlen);
		for(i=0; i<dlen; i++) buff[i] = data[jpegData.jpegOffset+i];
	}
	else
	{
		tlen = jpegData.tables.length;
		buff = new Uint8Array(tlen + jpegData.sosMarker.length + len + 2);
		buff.set(jpegData.tables);
		buffoff = tlen;

		buff[jpegData.sofPosition+5] = (img.height >>> 8) & 255;  buff[jpegData.sofPosition+6] = img.height & 255;
		buff[jpegData.sofPosition+7] = (img.width  >>> 8) & 255;  buff[jpegData.sofPosition+8] = img.width  & 255;

		if(data[off]!=255 || data[off+1]!=SOS)
		{
			buff.set(jpegData.sosMarker, buffoff);
			buffoff += sosMarker.length;
		}
		for(i=0; i<len; i++) buff[buffoff++] = data[off+i];
		buff[buffoff++] = 255;  buff[buffoff++] = EOI;
	}

	var parser = new UTIF.JpegDecoder();  parser.parse(buff);
	var decoded = parser.getData(parser.width, parser.height);
	for (var i=0; i<decoded.length; i++) tgt[toff + i] = decoded[i];

	// PhotometricInterpretation is 6 (YCbCr) for JPEG, but after decoding we populate data in
	// RGB format, so updating the tag value
	if(img["t262"] && img["t262"][0] == 6)  img["t262"][0] = 2;
}

UTIF.decode._decodePackBits = function(data, off, len, tgt, toff)
{
	var sa = new Int8Array(data.buffer), ta = new Int8Array(tgt.buffer), lim = off+len;
	while(off<lim)
	{
		var n = sa[off];  off++;
		if(n>=0  && n<128)    for(var i=0; i< n+1; i++) {  ta[toff]=sa[off];  toff++;  off++;   }
		if(n>=-127 && n<0) {  for(var i=0; i<-n+1; i++) {  ta[toff]=sa[off];  toff++;           }  off++;  }
	}
}

UTIF.decode._decodeThunder = function(data, off, len, tgt, toff)
{
	var d2 = [ 0, 1, 0, -1 ],  d3 = [ 0, 1, 2, 3, 0, -3, -2, -1 ];
	var lim = off+len, qoff = toff*2, px = 0;
	while(off<lim)
	{
		var b = data[off], msk = (b>>>6), n = (b&63);  off++;
		if(msk==3) { px=(n&15);  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++;   }
		if(msk==0) for(var i=0; i<n; i++) {  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++;   }
		if(msk==2) for(var i=0; i<2; i++) {  var d=(n>>>(3*(1-i)))&7;  if(d!=4) { px+=d3[d];  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++; }  }
		if(msk==1) for(var i=0; i<3; i++) {  var d=(n>>>(2*(2-i)))&3;  if(d!=2) { px+=d2[d];  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++; }  }
	}
}

UTIF.decode._dmap = { "1":0,"011":1,"000011":2,"0000011":3, "010":-1,"000010":-2,"0000010":-3  };
UTIF.decode._lens = ( function()
{
	var addKeys = function(lens, arr, i0, inc) {  for(var i=0; i<arr.length; i++) lens[arr[i]] = i0 + i*inc;  }

	var termW = "00110101,000111,0111,1000,1011,1100,1110,1111,10011,10100,00111,01000,001000,000011,110100,110101," // 15
	+ "101010,101011,0100111,0001100,0001000,0010111,0000011,0000100,0101000,0101011,0010011,0100100,0011000,00000010,00000011,00011010," // 31
	+ "00011011,00010010,00010011,00010100,00010101,00010110,00010111,00101000,00101001,00101010,00101011,00101100,00101101,00000100,00000101,00001010," // 47
	+ "00001011,01010010,01010011,01010100,01010101,00100100,00100101,01011000,01011001,01011010,01011011,01001010,01001011,00110010,00110011,00110100";

	var termB = "0000110111,010,11,10,011,0011,0010,00011,000101,000100,0000100,0000101,0000111,00000100,00000111,000011000," // 15
	+ "0000010111,0000011000,0000001000,00001100111,00001101000,00001101100,00000110111,00000101000,00000010111,00000011000,000011001010,000011001011,000011001100,000011001101,000001101000,000001101001," // 31
	+ "000001101010,000001101011,000011010010,000011010011,000011010100,000011010101,000011010110,000011010111,000001101100,000001101101,000011011010,000011011011,000001010100,000001010101,000001010110,000001010111," // 47
	+ "000001100100,000001100101,000001010010,000001010011,000000100100,000000110111,000000111000,000000100111,000000101000,000001011000,000001011001,000000101011,000000101100,000001011010,000001100110,000001100111";

	var makeW = "11011,10010,010111,0110111,00110110,00110111,01100100,01100101,01101000,01100111,011001100,011001101,011010010,011010011,011010100,011010101,011010110,"
	+ "011010111,011011000,011011001,011011010,011011011,010011000,010011001,010011010,011000,010011011";

	var makeB = "0000001111,000011001000,000011001001,000001011011,000000110011,000000110100,000000110101,0000001101100,0000001101101,0000001001010,0000001001011,0000001001100,"
	+ "0000001001101,0000001110010,0000001110011,0000001110100,0000001110101,0000001110110,0000001110111,0000001010010,0000001010011,0000001010100,0000001010101,0000001011010,"
	+ "0000001011011,0000001100100,0000001100101";

	var makeA = "00000001000,00000001100,00000001101,000000010010,000000010011,000000010100,000000010101,000000010110,000000010111,000000011100,000000011101,000000011110,000000011111";

	termW = termW.split(",");  termB = termB.split(",");  makeW = makeW.split(",");  makeB = makeB.split(",");  makeA = makeA.split(",");

	var lensW = {}, lensB = {};
	addKeys(lensW, termW, 0, 1);  addKeys(lensW, makeW, 64,64);  addKeys(lensW, makeA, 1792,64);
	addKeys(lensB, termB, 0, 1);  addKeys(lensB, makeB, 64,64);  addKeys(lensB, makeA, 1792,64);
	return [lensW, lensB];
} )();

UTIF.decode._decodeG4 = function(data, off, slen, tgt, toff, w, fo)
{
	var U = UTIF.decode, boff=off<<3, len=0, wrd="";	// previous starts with 1
	var line=[], pline=[];  for(var i=0; i<w; i++) pline.push(0);  pline=U._makeDiff(pline);
	var a0=0, a1=0, a2=0, b1=0, b2=0, clr=0;
	var y=0, mode="", toRead=0;
	var bipl = Math.ceil(w/8)*8;

	while((boff>>>3)<off+slen)
	{
		b1 = U._findDiff(pline, a0+(a0==0?0:1), 1-clr), b2 = U._findDiff(pline, b1, clr);	// could be precomputed
		var bit =0;
		if(fo==1) bit = (data[boff>>>3]>>>(7-(boff&7)))&1;
		if(fo==2) bit = (data[boff>>>3]>>>(  (boff&7)))&1;
		boff++;  wrd+=bit;
		if(mode=="H")
		{
			if(U._lens[clr][wrd]!=null)
			{
				var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
				if(dl<64) {  U._addNtimes(line,len,clr);  a0+=len;  clr=1-clr;  len=0;  toRead--;  if(toRead==0) mode="";  }
			}
		}
		else
		{
			if(wrd=="0001")  {  wrd="";  U._addNtimes(line,b2-a0,clr);  a0=b2;   }
			if(wrd=="001" )  {  wrd="";  mode="H";  toRead=2;  }
			if(U._dmap[wrd]!=null) {  a1 = b1+U._dmap[wrd];  U._addNtimes(line, a1-a0, clr);  a0=a1;  wrd="";  clr=1-clr;  }
		}
		if(line.length==w && mode=="")
		{
			U._writeBits(line, tgt, toff*8+y*bipl);
			clr=0;  y++;  a0=0;
			pline=U._makeDiff(line);  line=[];
		}
		//if(wrd.length>150) {  log(wrd);  break;  throw "e";  }
	}
}

UTIF.decode._findDiff = function(line, x, clr) {  for(var i=0; i<line.length; i+=2) if(line[i]>=x && line[i+1]==clr)  return line[i];  }

UTIF.decode._makeDiff = function(line)
{
	var out = [];  if(line[0]==1) out.push(0,1);
	for(var i=1; i<line.length; i++) if(line[i-1]!=line[i]) out.push(i, line[i]);
	out.push(line.length,0,line.length,1);  return out;
}

UTIF.decode._decodeG3 = function(data, off, slen, tgt, toff, w, fo, twoDim)
{
	var U = UTIF.decode, boff=off<<3, len=0, wrd="";
	var line=[], pline=[];  for(var i=0; i<w; i++) line.push(0);
	var a0=0, a1=0, a2=0, b1=0, b2=0, clr=0;
	var y=-1, mode="", toRead=0, is1D=true;
	var bipl = Math.ceil(w/8)*8;
	while((boff>>>3)<off+slen)
	{
		b1 = U._findDiff(pline, a0+(a0==0?0:1), 1-clr), b2 = U._findDiff(pline, b1, clr);	// could be precomputed
		var bit =0;
		if(fo==1) bit = (data[boff>>>3]>>>(7-(boff&7)))&1;
		if(fo==2) bit = (data[boff>>>3]>>>(  (boff&7)))&1;
		boff++;  wrd+=bit;

		if(is1D)
		{
			if(U._lens[clr][wrd]!=null)
			{
				var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
				if(dl<64) {  U._addNtimes(line,len,clr);  clr=1-clr;  len=0;  }
			}
		}
		else
		{
			if(mode=="H")
			{
				if(U._lens[clr][wrd]!=null)
				{
					var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
					if(dl<64) {  U._addNtimes(line,len,clr);  a0+=len;  clr=1-clr;  len=0;  toRead--;  if(toRead==0) mode="";  }
				}
			}
			else
			{
				if(wrd=="0001")  {  wrd="";  U._addNtimes(line,b2-a0,clr);  a0=b2;   }
				if(wrd=="001" )  {  wrd="";  mode="H";  toRead=2;  }
				if(U._dmap[wrd]!=null) {  a1 = b1+U._dmap[wrd];  U._addNtimes(line, a1-a0, clr);  a0=a1;  wrd="";  clr=1-clr;  }
			}
		}
		if(wrd.endsWith("000000000001")) // needed for some files
		{
			if(y>=0) U._writeBits(line, tgt, toff*8+y*bipl);
			if(twoDim) {
				if(fo==1) is1D = ((data[boff>>>3]>>>(7-(boff&7)))&1)==1;
				if(fo==2) is1D = ((data[boff>>>3]>>>(  (boff&7)))&1)==1;
				boff++;
			}
			//log("EOL",y, "next 1D:", is1D);
			wrd="";  clr=0;  y++;  a0=0;
			pline=U._makeDiff(line);  line=[];
		}
	}
	if(line.length==w) U._writeBits(line, tgt, toff*8+y*bipl);
}

UTIF.decode._addNtimes = function(arr, n, val) {  for(var i=0; i<n; i++) arr.push(val);  }

UTIF.decode._writeBits = function(bits, tgt, boff)
{
	for(var i=0; i<bits.length; i++) tgt[(boff+i)>>>3] |= (bits[i]<<(7-((boff+i)&7)));
}

UTIF.decode._decodeLZW = function(){var x={},y=function(L,F,i,W,_){for(var a=0;a<_;a+=4){i[W+a]=L[F+a];
i[W+a+1]=L[F+a+1];i[W+a+2]=L[F+a+2];i[W+a+3]=L[F+a+3]}},c=function(L,F,i,W){if(!x.c){var _=new Uint32Array(65535),a=new Uint16Array(65535),Z=new Uint8Array(2e6);
for(var f=0;f<256;f++){Z[f<<2]=f;_[f]=f<<2;a[f]=1}x.c=[_,a,Z]}var o=x.c[0],z=x.c[1],Z=x.c[2],h=258,n=258<<2,k=9,C=F<<3,m=256,B=257,p=0,O=0,K=0;
while(!0){p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;if(O==m){k=9;
h=258;n=258<<2;p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;
i[W]=O;W++}else if(O<h){var J=o[O],q=z[O];y(Z,J,i,W,q);W+=q;if(K>=h){o[h]=n;Z[o[h]]=J[0];z[h]=1;n=n+1+3&~3;
h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[J];l++;z[h]=l;h++;n=n+l+3&~3}if(h+1==1<<k)k++}else{if(K>=h){o[h]=n;
z[h]=0;h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[n];l++;z[h]=l;h++;y(Z,n,i,W,l);W+=l;n=n+l+3&~3}if(h+1==1<<k)k++}K=O}return W};
return c}();

UTIF.tags = {};
//UTIF.ttypes = {  256:3,257:3,258:3,   259:3, 262:3,  273:4,  274:3, 277:3,278:4,279:4, 282:5, 283:5, 284:3, 286:5,287:5, 296:3, 305:2, 306:2, 338:3, 513:4, 514:4, 34665:4  };
// start at tag 250
UTIF._types = function() {
	var main = new Array(250);  main.fill(0);
	main = main.concat([0,0,0,0,4,3,3,3,3,3,0,0,3,0,0,0,3,0,0,2,2,2,2,4,3,0,0,3,4,4,3,3,5,5,3,2,5,5,0,0,0,0,4,4,0,0,3,3,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,2,2,3,5,5,3,0,3,3,4,4,4,3,4,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
	var rest = {33432: 2, 33434: 5, 33437: 5, 34665: 4, 34850: 3, 34853: 4, 34855: 3, 34864: 3, 34866: 4, 36864: 7, 36867: 2, 36868: 2, 37121: 7, 37377: 10, 37378: 5, 37380: 10, 37381: 5, 37383: 3, 37384: 3, 37385: 3, 37386: 5, 37510: 7, 37520: 2, 37521: 2, 37522: 2, 40960: 7, 40961: 3, 40962: 4, 40963: 4, 40965: 4, 41486: 5, 41487: 5, 41488: 3, 41985: 3, 41986: 3, 41987: 3, 41988: 5, 41989: 3, 41990: 3, 41993: 3, 41994: 3, 41995: 7, 41996: 3, 42032: 2, 42033: 2, 42034: 5, 42036: 2, 42037: 2, 59932: 7};
	return {
		basic: {
			main: main,
			rest: rest
		},
		gps: {
			main: [1,2,5,2,5,1,5,5,0,9],
			rest: {18:2,29:2}
		}
	}
}();

UTIF._readIFD = function(bin, data, offset, ifds, depth, prm)
{
	var cnt = bin.readUshort(data, offset);  offset+=2;
	var ifd = {};

	if(prm.debug) log("   ".repeat(depth),ifds.length-1,">>>----------------");
	for(var i=0; i<cnt; i++)
	{
		var tag  = bin.readUshort(data, offset);    offset+=2;
		var type = bin.readUshort(data, offset);    offset+=2;
		var num  = bin.readUint  (data, offset);    offset+=4;
		var voff = bin.readUint  (data, offset);    offset+=4;
		
		var arr = [];
		//ifd["t"+tag+"-"+UTIF.tags[tag]] = arr;
		if(type== 1 || type==7) {  arr = new Uint8Array(data.buffer, (num<5 ? offset-4 : voff), num);  }
		if(type== 2) {  var o0 = (num<5 ? offset-4 : voff), c=data[o0], len=Math.max(0, Math.min(num-1,data.length-o0));
						if(c<128 || len==0) arr.push( bin.readASCII(data, o0, len) );
						else      arr = new Uint8Array(data.buffer, o0, len);  }
		if(type== 3) {  for(var j=0; j<num; j++) arr.push(bin.readUshort(data, (num<3 ? offset-4 : voff)+2*j));  }
		if(type== 4 
		|| type==13) {  for(var j=0; j<num; j++) arr.push(bin.readUint  (data, (num<2 ? offset-4 : voff)+4*j));  }
		if(type== 5 || type==10) {  
			var ri = type==5 ? bin.readUint : bin.readInt;
			for(var j=0; j<num; j++) arr.push([ri(data, voff+j*8), ri(data,voff+j*8+4)]);  }
		if(type== 8) {  for(var j=0; j<num; j++) arr.push(bin.readShort (data, (num<3 ? offset-4 : voff)+2*j));  }
		if(type== 9) {  for(var j=0; j<num; j++) arr.push(bin.readInt   (data, (num<2 ? offset-4 : voff)+4*j));  }
		if(type==11) {  for(var j=0; j<num; j++) arr.push(bin.readFloat (data, voff+j*4));  }
		if(type==12) {  for(var j=0; j<num; j++) arr.push(bin.readDouble(data, voff+j*8));  }
		
		ifd["t"+tag] = arr;
		
		if(num!=0 && arr.length==0) {  log(tag, "unknown TIFF tag type: ", type, "num:",num);  if(i==0)return;  continue;  }
		if(prm.debug) log("   ".repeat(depth), tag, type, UTIF.tags[tag], arr);
		
		if(tag==330 && ifd["t272"] && ifd["t272"][0]=="DSLR-A100") {  } 
		else if(tag==330 || tag==34665 || tag==34853 || (tag==50740 && bin.readUshort(data,bin.readUint(arr,0))<300  ) ||tag==61440) {
			var oarr = tag==50740 ? [bin.readUint(arr,0)] : arr;
			var subfd = [];
			for(var j=0; j<oarr.length; j++) UTIF._readIFD(bin, data, oarr[j], subfd, depth+1, prm);
			if(tag==  330) ifd.subIFD = subfd;
			if(tag==34665) ifd.exifIFD = subfd[0];
			if(tag==34853) ifd.gpsiIFD = subfd[0];  //console.log("gps", subfd[0]);  }
			if(tag==50740) ifd.dngPrvt = subfd[0];
			if(tag==61440) ifd.fujiIFD = subfd[0];
		}
		if(tag==37500 && prm.parseMN) {
			var mn = arr;
			//console.log(bin.readASCII(mn,0,mn.length), mn);
			if(bin.readASCII(mn,0,5)=="Nikon")  ifd.makerNote = UTIF["decode"](mn.slice(10).buffer)[0];
			else if(bin.readUshort(data,voff)<300 && bin.readUshort(data,voff+4)<=12){
				var subsub=[];  UTIF._readIFD(bin, data, voff, subsub, depth+1, prm);
				ifd.makerNote = subsub[0];
			}
		}
	}
	ifds.push(ifd);
	if(prm.debug) log("   ".repeat(depth),"<<<---------------");
	return offset;
}

UTIF._writeIFD = function(bin, types, data, offset, ifd)
{
	var keys = Object.keys(ifd), knum=keys.length;  if(ifd["exifIFD"]) knum--;  if(ifd["gpsiIFD"]) knum--;
	bin.writeUshort(data, offset, knum);  offset+=2;

	var eoff = offset + knum*12 + 4;

	for(var ki=0; ki<keys.length; ki++)
	{
		var key = keys[ki];  if(key=="t34665" || key=="t34853") continue;  
		if(key=="exifIFD") key="t34665";  if(key=="gpsiIFD") key="t34853";
		var tag = parseInt(key.slice(1)), type = types.main[tag];  if(type==null) type=types.rest[tag];		
		if(type==null || type==0) throw new Error("unknown type of tag: "+tag);
		//console.log(offset+":", tag, type, eoff);
		var val = ifd[key];  
		if(tag==34665) {
			var outp = UTIF._writeIFD(bin, types, data, eoff, ifd["exifIFD"]);
			val = [eoff];  eoff = outp[1];
		}
		if(tag==34853) {
			var outp = UTIF._writeIFD(bin, UTIF._types.gps, data, eoff, ifd["gpsiIFD"]);
			val = [eoff];  eoff = outp[1];
		}
		if(type==2) val=val[0]+"\u0000";  var num = val.length;
		bin.writeUshort(data, offset, tag );  offset+=2;
		bin.writeUshort(data, offset, type);  offset+=2;
		bin.writeUint  (data, offset, num );  offset+=4;

		var dlen = [-1, 1, 1, 2, 4, 8, 0, 1, 0, 4, 8, 0, 8][type] * num;  //if(dlen<1) throw "e";
		var toff = offset;
		if(dlen>4) {  bin.writeUint(data, offset, eoff);  toff=eoff;  }

		if     (type== 1 || type==7) {  for(var i=0; i<num; i++) data[toff+i] = val[i];  }
		else if(type== 2) {  bin.writeASCII(data, toff, val);   }
		else if(type== 3) {  for(var i=0; i<num; i++) bin.writeUshort(data, toff+2*i, val[i]);    }
		else if(type== 4) {  for(var i=0; i<num; i++) bin.writeUint  (data, toff+4*i, val[i]);    }
		else if(type== 5 || type==10) {  
			var wr = type==5?bin.writeUint:bin.writeInt;
			for(var i=0; i<num; i++) {  
			var v=val[i],nu=v[0],de=v[1];  if(nu==null) throw "e";  wr(data, toff+8*i, nu);  wr(data, toff+8*i+4, de);  }   }
		else if(type== 9) {  for(var i=0; i<num; i++) bin.writeInt   (data, toff+4*i, val[i]);    }
		else if(type==12) {  for(var i=0; i<num; i++) bin.writeDouble(data, toff+8*i, val[i]);    }
		else throw type;

		if(dlen>4) {  dlen += (dlen&1);  eoff += dlen;  }
		offset += 4;
	}
	return [offset, eoff];
}

UTIF.toRGBA8 = function(out)
{
	var w = out.width, h = out.height, area = w*h, qarea = area*4, data = out.data;
	var img = new Uint8Array(area*4);
	//console.log(out);
	// 0: WhiteIsZero, 1: BlackIsZero, 2: RGB, 3: Palette color, 4: Transparency mask, 5: CMYK
	var intp = (out["t262"] ? out["t262"][0]: 2), bps = (out["t258"]?Math.min(32,out["t258"][0]):1);
	//log("interpretation: ", intp, "bps", bps, out);
	if(false) {}
	else if(intp==0)
	{
		var bpl = Math.ceil(bps*w/8);
		for(var y=0; y<h; y++) {
			var off = y*bpl, io = y*w;
			if(bps== 1) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>3)])>>(7-  (i&7)))& 1;  img[qi]=img[qi+1]=img[qi+2]=( 1-px)*255;  img[qi+3]=255;    }
			if(bps== 4) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>1)])>>(4-4*(i&1)))&15;  img[qi]=img[qi+1]=img[qi+2]=(15-px)* 17;  img[qi+3]=255;    }
			if(bps== 8) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+i];  img[qi]=img[qi+1]=img[qi+2]=255-px;  img[qi+3]=255;    }
		}
	}
	else if(intp==1)
	{
		var smpls = out["t258"]?out["t258"].length : 1;
		var bpl = Math.ceil(smpls*bps*w/8);
		for(var y=0; y<h; y++) {
			var off = y*bpl, io = y*w;
			if(bps== 1) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>3)])>>(7-  (i&7)))&1;   img[qi]=img[qi+1]=img[qi+2]=(px)*255;  img[qi+3]=255;    }
			if(bps== 2) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>2)])>>(6-2*(i&3)))&3;   img[qi]=img[qi+1]=img[qi+2]=(px)* 85;  img[qi+3]=255;    }
			if(bps== 8) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+i*smpls];  img[qi]=img[qi+1]=img[qi+2]=    px;  img[qi+3]=255;    }
			if(bps==16) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+(2*i+1)];  img[qi]=img[qi+1]=img[qi+2]= Math.min(255,px);  img[qi+3]=255;    } // ladoga.tif
		}
	}
	else if(intp==2)
	{
		var smpls = out["t258"]?out["t258"].length : 3;
		
		if(bps== 8) 
		{
			if(smpls==4) for(var i=0; i<qarea; i++) img[i] = data[i];
			if(smpls==3) for(var i=0; i< area; i++) {  var qi=i<<2, ti=i*3;  img[qi]=data[ti];  img[qi+1]=data[ti+1];  img[qi+2]=data[ti+2];  img[qi+3]=255;    }
		}
		else{  // 3x 16-bit channel
			if(smpls==4) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*8+1;  img[qi]=data[ti];  img[qi+1]=data[ti+2];  img[qi+2]=data[ti+4];  img[qi+3]=data[ti+6];    }
			if(smpls==3) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6+1;  img[qi]=data[ti];  img[qi+1]=data[ti+2];  img[qi+2]=data[ti+4];  img[qi+3]=255;           }
		}
	}
	else if(intp==3)
	{
		var map = out["t320"];
		var smpls = out["t258"]?out["t258"].length : 1;
		for(var i=0; i<area; i++) {  var qi=i<<2, mi=data[i*smpls];  img[qi]=(map[mi]>>8);  img[qi+1]=(map[256+mi]>>8);  img[qi+2]=(map[512+mi]>>8);  img[qi+3]=255;    }
	}
	else if(intp==5) 
	{
		var smpls = out["t258"]?out["t258"].length : 4;
		var gotAlpha = smpls>4 ? 1 : 0;
		for(var i=0; i<area; i++) {
			var qi=i<<2, si=i*smpls;  var C=255-data[si], M=255-data[si+1], Y=255-data[si+2], K=(255-data[si+3])*(1/255);
			img[qi]=~~(C*K+0.5);  img[qi+1]=~~(M*K+0.5);  img[qi+2]=~~(Y*K+0.5);  img[qi+3]=255*(1-gotAlpha)+data[si+4]*gotAlpha;
		}
	}
	else if(intp==6 && out["t278"]) {  // only for DSC_1538.TIF
		var rps = out["t278"][0];
		for(var y=0; y<h; y+=rps) {
			var i=(y*w), len = rps*w;
			
			for(var j=0; j<len; j++) {
				var qi = 4*(i+j), si = 3*i+4*(j>>>1);
				var Y = data[si+(j&1)], Cb=data[si+2]-128, Cr=data[si+3]-128;
				
				var r = Y + ( (Cr >> 2) + (Cr >> 3) + (Cr >> 5) ) ;
				var g = Y - ( (Cb >> 2) + (Cb >> 4) + (Cb >> 5)) - ( (Cr >> 1) + (Cr >> 3) + (Cr >> 4) + (Cr >> 5)) ;
				var b = Y + ( Cb + (Cb >> 1) + (Cb >> 2) + (Cb >> 6)) ;
				
				img[qi  ]=Math.max(0,Math.min(255,r));
				img[qi+1]=Math.max(0,Math.min(255,g));
				img[qi+2]=Math.max(0,Math.min(255,b));
				img[qi+3]=255;
			}
		}
	}
	else log("Unknown Photometric interpretation: "+intp);
	return img;
}

UTIF.replaceIMG = function(imgs)
{
	if(imgs==null) imgs = document.getElementsByTagName("img");
	var sufs = ["tif","tiff","dng","cr2","nef"]
	for (var i=0; i<imgs.length; i++)
	{
		var img=imgs[i], src=img.getAttribute("src");  if(src==null) continue;
		var suff=src.split(".").pop().toLowerCase();
		if(sufs.indexOf(suff)==-1) continue;
		var xhr = new XMLHttpRequest();  UTIF._xhrs.push(xhr);  UTIF._imgs.push(img);
		xhr.open("GET", src);  xhr.responseType = "arraybuffer";
		xhr.onload = UTIF._imgLoaded;   xhr.send();
	}
}

UTIF._xhrs = [];  UTIF._imgs = [];
UTIF._imgLoaded = function(e)
{
	var buff = e.target.response;
	var ifds = UTIF.decode(buff);  //console.log(ifds);
	var vsns = ifds, ma=0, page=vsns[0];  if(ifds[0].subIFD) vsns = vsns.concat(ifds[0].subIFD);
	for(var i=0; i<vsns.length; i++) {
		var img = vsns[i];
		if(img["t258"]==null || img["t258"].length<3) continue;
		var ar = img["t256"]*img["t257"];
		if(ar>ma) {  ma=ar;  page=img;  }
	}
	UTIF.decodeImage(buff, page, ifds);
	var rgba = UTIF.toRGBA8(page), w=page.width, h=page.height;
	var ind = UTIF._xhrs.indexOf(e.target), img = UTIF._imgs[ind];
	UTIF._xhrs.splice(ind,1);  UTIF._imgs.splice(ind,1);
	var cnv = document.createElement("canvas");  cnv.width=w;  cnv.height=h;
	var ctx = cnv.getContext("2d"), imgd = ctx.createImageData(w,h);
	for(var i=0; i<rgba.length; i++) imgd.data[i]=rgba[i];       ctx.putImageData(imgd,0,0);
	img.setAttribute("src",cnv.toDataURL());
}


UTIF._binBE =
{
	nextZero   : function(data, o) {  while(data[o]!=0) o++;  return o;  },
	readUshort : function(buff, p) {  return (buff[p]<< 8) |  buff[p+1];  },
	readShort  : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+1];  a[1]=buff[p+0];                                    return UTIF._binBE. i16[0];  },
	readInt    : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+3];  a[1]=buff[p+2];  a[2]=buff[p+1];  a[3]=buff[p+0];  return UTIF._binBE. i32[0];  },
	readUint   : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+3];  a[1]=buff[p+2];  a[2]=buff[p+1];  a[3]=buff[p+0];  return UTIF._binBE.ui32[0];  },
	readASCII  : function(buff, p, l) {  var s = "";   for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);   return s; },
	readFloat  : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0;i<4;i++) a[i]=buff[p+3-i];  return UTIF._binBE.fl32[0];  },
	readDouble : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0;i<8;i++) a[i]=buff[p+7-i];  return UTIF._binBE.fl64[0];  },

	writeUshort: function(buff, p, n) {  buff[p] = (n>> 8)&255;  buff[p+1] =  n&255;  },
	writeInt   : function(buff, p, n) {  var a=UTIF._binBE.ui8;  UTIF._binBE.i32[0]=n;  buff[p+3]=a[0];  buff[p+2]=a[1];  buff[p+1]=a[2];  buff[p+0]=a[3];  },
	writeUint  : function(buff, p, n) {  buff[p] = (n>>24)&255;  buff[p+1] = (n>>16)&255;  buff[p+2] = (n>>8)&255;  buff[p+3] = (n>>0)&255;  },
	writeASCII : function(buff, p, s) {  for(var i = 0; i < s.length; i++)  buff[p+i] = s.charCodeAt(i);  },
	writeDouble: function(buff, p, n)
	{
		UTIF._binBE.fl64[0] = n;
		for (var i = 0; i < 8; i++) buff[p + i] = UTIF._binBE.ui8[7 - i];
	}
}
UTIF._binBE.ui8  = new Uint8Array  (8);
UTIF._binBE.i16  = new Int16Array  (UTIF._binBE.ui8.buffer);
UTIF._binBE.i32  = new Int32Array  (UTIF._binBE.ui8.buffer);
UTIF._binBE.ui32 = new Uint32Array (UTIF._binBE.ui8.buffer);
UTIF._binBE.fl32 = new Float32Array(UTIF._binBE.ui8.buffer);
UTIF._binBE.fl64 = new Float64Array(UTIF._binBE.ui8.buffer);

UTIF._binLE =
{
	nextZero   : UTIF._binBE.nextZero,
	readUshort : function(buff, p) {  return (buff[p+1]<< 8) |  buff[p];  },
	readShort  : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0];  a[1]=buff[p+1];                                    return UTIF._binBE. i16[0];  },
	readInt    : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0];  a[1]=buff[p+1];  a[2]=buff[p+2];  a[3]=buff[p+3];  return UTIF._binBE. i32[0];  },
	readUint   : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0];  a[1]=buff[p+1];  a[2]=buff[p+2];  a[3]=buff[p+3];  return UTIF._binBE.ui32[0];  },
	readASCII  : UTIF._binBE.readASCII,
	readFloat  : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0;i<4;i++) a[i]=buff[p+  i];  return UTIF._binBE.fl32[0];  },
	readDouble : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0;i<8;i++) a[i]=buff[p+  i];  return UTIF._binBE.fl64[0];  },
	
	writeUshort: function(buff, p, n) {  buff[p] = (n)&255;  buff[p+1] =  (n>>8)&255;  },
	writeInt   : function(buff, p, n) {  var a=UTIF._binBE.ui8;  UTIF._binBE.i32[0]=n;  buff[p+0]=a[0];  buff[p+1]=a[1];  buff[p+2]=a[2];  buff[p+3]=a[3];  },
	writeUint  : function(buff, p, n) {  buff[p] = (n>>>0)&255;  buff[p+1] = (n>>>8)&255;  buff[p+2] = (n>>>16)&255;  buff[p+3] = (n>>>24)&255;  },
	writeASCII : UTIF._binBE.writeASCII
}
UTIF._copyTile = function(tb, tw, th, b, w, h, xoff, yoff)
{
	//log("copyTile", tw, th,  w, h, xoff, yoff);
	var xlim = Math.min(tw, w-xoff);
	var ylim = Math.min(th, h-yoff);
	for(var y=0; y<ylim; y++)
	{
		var tof = (yoff+y)*w+xoff;
		var sof = y*tw;
		for(var x=0; x<xlim; x++) b[tof+x] = tb[sof+x];
	}
}

UTIF.LosslessJpegDecode = (function(){function t(Z){this.w=Z;this.N=0;this._=0;this.G=0}t.prototype={t:function(Z){this.N=Math.max(0,Math.min(this.w.length,Z))},i:function(){return this.w[this.N++]},l:function(){var Z=this.N;
this.N+=2;return this.w[Z]<<8|this.w[Z+1]},J:function(){if(this._==0){this.G=this.w[this.N];this.N+=1+(this.G+1>>>8);
this._=8}return this.G>>>--this._&1},Z:function(Z){var X=this._,s=this.G,E=Math.min(X,Z);Z-=E;X-=E;var Y=s>>>X&(1<<E)-1;
while(Z>0){s=this.w[this.N];this.N+=1+(s+1>>>8);E=Math.min(8,Z);Z-=E;X=8-E;Y<<=E;Y|=s>>>X&(1<<E)-1}this._=X;
this.G=s;return Y}};var i={};i.X=function(){return[0,0,-1]};i.s=function(Z,X,s){Z[i.Y(Z,0,s)+2]=X};i.Y=function(Z,X,s){if(Z[X+2]!=-1)return 0;
if(s==0)return X;for(var E=0;E<2;E++){if(Z[X+E]==0){Z[X+E]=Z.length;Z.push(0);Z.push(0);Z.push(-1)}var Y=i.Y(Z,Z[X+E],s-1);
if(Y!=0)return Y}return 0};i.B=function(Z,X){var s=0,E=0,Y=0,B=X._,$=X.G,e=X.N;while(!0){if(B==0){$=X.w[e];
e+=1+($+1>>>8);B=8}Y=$>>>--B&1;s=Z[s+Y];E=Z[s+2];if(E!=-1){X._=B;X.G=$;X.N=e;return E}}return-1};function l(Z){this.z=new t(Z);
this.D(this.z)}l.prototype={$:function(Z,X){this.Q=Z.i();this.F=Z.l();this.o=Z.l();var s=this.O=Z.i();
this.L=[];for(var E=0;E<s;E++){var Y=Z.i(),B=Z.i();Z.i();this.L[Y]=E}Z.t(Z.N+X-(6+s*3))},e:function(){var Z=0,X=this.z.i();
if(this.H==null)this.H={};var s=this.H[X]=i.X(),E=[];for(var Y=0;Y<16;Y++){E[Y]=this.z.i();Z+=E[Y]}for(var Y=0;
Y<16;Y++)for(var B=0;B<E[Y];B++)i.s(s,this.z.i(),Y+1);return Z+17},W:function(Z){while(Z>0)Z-=this.e()},p:function(Z,X){var s=Z.i();
if(!this.U){this.U=[]}for(var E=0;E<s;E++){var Y=Z.i(),B=Z.i();this.U[this.L[Y]]=this.H[B>>>4]}this.g=Z.i();
Z.t(Z.N+X-(2+s*2))},D:function(Z){var X=!1,s=Z.l();if(s!==l.q)return;do{var s=Z.l(),E=Z.l()-2;switch(s){case l.m:this.$(Z,E);
break;case l.K:this.W(E);break;case l.V:this.p(Z,E);X=!0;break;default:Z.t(Z.N+E);break}}while(!X)},I:function(Z,X){var s=i.B(X,Z);
if(s==16)return-32768;var E=Z.Z(s);if((E&1<<s-1)==0)E-=(1<<s)-1;return E},B:function(Z,X){var s=this.z,E=this.O,Y=this.F,B=this.I,$=this.g,e=this.o*E,W=this.U;
for(var p=0;p<E;p++){Z[p]=B(s,W[p])+(1<<this.Q-1)}for(var D=E;D<e;D+=E){for(var p=0;p<E;p++)Z[D+p]=B(s,W[p])+Z[D+p-E]}var I=X;
for(var m=1;m<Y;m++){for(var p=0;p<E;p++){Z[I+p]=B(s,W[p])+Z[I+p-X]}for(var D=E;D<e;D+=E){for(var p=0;
p<E;p++){var K=I+D+p,q=Z[K-E];if($==6)q=Z[K-X]+(q-Z[K-E-X]>>>1);Z[K]=q+B(s,W[p])}}I+=X}}};l.m=65475;
l.K=65476;l.q=65496;l.V=65498;function J(Z){var X=new l(Z),s=X.Q>8?Uint16Array:Uint8Array,E=new s(X.o*X.F*X.O),Y=X.o*X.O;
X.B(E,Y);return E}return J}())




})(UTIF, pako);
})();// Copyright 2011 Google Inc.
//
// This code is licensed under the same terms as WebM:
//  Software License Agreement:  http://www.webmproject.org/license/software/
//  Additional IP Rights Grant:  http://www.webmproject.org/license/additional/
// -----------------------------------------------------------------------------
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
// IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, 
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY 
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, 
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// -----------------------------------------------------------------------------
//
// Copyright 2011-2017 Dominik Homberger
// Libwebp Javascript / libwebpjs - the libwebp implementation in javascript (v0.6.0)
//
// Author: Dominik Homberger (dominik.homberger@gmail.com)
(function() {
function x(F){if(!F)throw Error("assert :P");}function fa(F,L,J){for(var H=0;4>H;H++)if(F[L+H]!=J.charCodeAt(H))return!0;return!1}function I(F,L,J,H,Z){for(var O=0;O<Z;O++)F[L+O]=J[H+O]}function M(F,L,J,H){for(var Z=0;Z<H;Z++)F[L+Z]=J}function V(F){return new Int32Array(F)}function wa(F,L){for(var J=[],H=0;H<F;H++)J.push(new L);return J}function wb(){function F(J,H,Z){for(var O=Z[H],L=0;L<O;L++){J.push(Z.length>H+1?[]:0);if(Z.length<H+1)break;F(J[L],H+1,Z)}}var L=[];F(L,0,[3,11]);return L}
function Ed(F,L){function J(H,O,F){for(var Z=F[O],ma=0;ma<Z;ma++){H.push(F.length>O+1?[]:new L);if(F.length<O+1)break;J(H[ma],O+1,F)}}var H=[];J(H,0,F);return H}
window.WebPDecoder=function(){function F(){V(55)}function L(a,b){for(var c=1<<b-1>>>0;a&c;)c>>>=1;return c?(a&c-1)+c:a}function J(a,b,c,d,e){x(!(d%c));do d-=c,a[b+d]=e;while(0<d)}function H(a,b,c,d,e,f){var g=b,h=1<<c,k,l,m=V(16),n=V(16);x(0!=e);x(null!=d);x(null!=a);x(0<c);for(l=0;l<e;++l){if(15<d[l])return 0;++m[d[l]]}if(m[0]==e)return 0;n[1]=0;for(k=1;15>k;++k){if(m[k]>1<<k)return 0;n[k+1]=n[k]+m[k]}for(l=0;l<e;++l)k=d[l],0<d[l]&&(f[n[k]++]=l);if(1==n[15])return d=new O,d.g=0,d.value=f[0],J(a,
g,1,h,d),h;var r=-1,q=h-1,t=0,v=1,p=1,u,w=1<<c;l=0;k=1;for(e=2;k<=c;++k,e<<=1){p<<=1;v+=p;p-=m[k];if(0>p)return 0;for(;0<m[k];--m[k])d=new O,d.g=k,d.value=f[l++],J(a,g+t,e,w,d),t=L(t,k)}k=c+1;for(e=2;15>=k;++k,e<<=1){p<<=1;v+=p;p-=m[k];if(0>p)return 0;for(;0<m[k];--m[k]){d=new O;if((t&q)!=r){g+=w;r=k;for(u=1<<r-c;15>r;){u-=m[r];if(0>=u)break;++r;u<<=1}u=r-c;w=1<<u;h+=w;r=t&q;a[b+r].g=u+c;a[b+r].value=g-b-r}d.g=k-c;d.value=f[l++];J(a,g+(t>>c),e,w,d);t=L(t,k)}}return v!=2*n[15]-1?0:h}function Z(a,b,
c,d,e){x(2328>=e);if(512>=e)var f=V(512);else if(f=V(e),null==f)return 0;return H(a,b,c,d,e,f)}function O(){this.value=this.g=0}function Fd(){this.value=this.g=0}function Ub(){this.G=wa(5,O);this.H=V(5);this.jc=this.Qb=this.qb=this.nd=0;this.pd=wa(xb,Fd)}function ma(a,b,c,d){x(null!=a);x(null!=b);x(2147483648>d);a.Ca=254;a.I=0;a.b=-8;a.Ka=0;a.oa=b;a.pa=c;a.Jd=b;a.Yc=c+d;a.Zc=4<=d?c+d-4+1:c;Qa(a)}function na(a,b){for(var c=0;0<b--;)c|=K(a,128)<<b;return c}function ca(a,b){var c=na(a,b);return G(a)?
-c:c}function cb(a,b,c,d){var e,f=0;x(null!=a);x(null!=b);x(4294967288>d);a.Sb=d;a.Ra=0;a.u=0;a.h=0;4<d&&(d=4);for(e=0;e<d;++e)f+=b[c+e]<<8*e;a.Ra=f;a.bb=d;a.oa=b;a.pa=c}function Vb(a){for(;8<=a.u&&a.bb<a.Sb;)a.Ra>>>=8,a.Ra+=a.oa[a.pa+a.bb]<<ob-8>>>0,++a.bb,a.u-=8;db(a)&&(a.h=1,a.u=0)}function D(a,b){x(0<=b);if(!a.h&&b<=Gd){var c=pb(a)&Hd[b];a.u+=b;Vb(a);return c}a.h=1;return a.u=0}function Wb(){this.b=this.Ca=this.I=0;this.oa=[];this.pa=0;this.Jd=[];this.Yc=0;this.Zc=[];this.Ka=0}function Ra(){this.Ra=
0;this.oa=[];this.h=this.u=this.bb=this.Sb=this.pa=0}function pb(a){return a.Ra>>>(a.u&ob-1)>>>0}function db(a){x(a.bb<=a.Sb);return a.h||a.bb==a.Sb&&a.u>ob}function qb(a,b){a.u=b;a.h=db(a)}function Sa(a){a.u>=Xb&&(x(a.u>=Xb),Vb(a))}function Qa(a){x(null!=a&&null!=a.oa);a.pa<a.Zc?(a.I=(a.oa[a.pa++]|a.I<<8)>>>0,a.b+=8):(x(null!=a&&null!=a.oa),a.pa<a.Yc?(a.b+=8,a.I=a.oa[a.pa++]|a.I<<8):a.Ka?a.b=0:(a.I<<=8,a.b+=8,a.Ka=1))}function G(a){return na(a,1)}function K(a,b){var c=a.Ca;0>a.b&&Qa(a);var d=a.b,
e=c*b>>>8,f=(a.I>>>d>e)+0;f?(c-=e,a.I-=e+1<<d>>>0):c=e+1;d=c;for(e=0;256<=d;)e+=8,d>>=8;d=7^e+Id[d];a.b-=d;a.Ca=(c<<d)-1;return f}function ra(a,b,c){a[b+0]=c>>24&255;a[b+1]=c>>16&255;a[b+2]=c>>8&255;a[b+3]=c>>0&255}function Ta(a,b){return a[b+0]<<0|a[b+1]<<8}function Yb(a,b){return Ta(a,b)|a[b+2]<<16}function Ha(a,b){return Ta(a,b)|Ta(a,b+2)<<16}function Zb(a,b){var c=1<<b;x(null!=a);x(0<b);a.X=V(c);if(null==a.X)return 0;a.Mb=32-b;a.Xa=b;return 1}function $b(a,b){x(null!=a);x(null!=b);x(a.Xa==b.Xa);
I(b.X,0,a.X,0,1<<b.Xa)}function ac(){this.X=[];this.Xa=this.Mb=0}function bc(a,b,c,d){x(null!=c);x(null!=d);var e=c[0],f=d[0];0==e&&(e=(a*f+b/2)/b);0==f&&(f=(b*e+a/2)/a);if(0>=e||0>=f)return 0;c[0]=e;d[0]=f;return 1}function xa(a,b){return a+(1<<b)-1>>>b}function yb(a,b){return((a&4278255360)+(b&4278255360)>>>0&4278255360)+((a&16711935)+(b&16711935)>>>0&16711935)>>>0}function X(a,b){self[b]=function(b,d,e,f,g,h,k){var c;for(c=0;c<g;++c){var m=self[a](h[k+c-1],e,f+c);h[k+c]=yb(b[d+c],m)}}}function Jd(){this.ud=
this.hd=this.jd=0}function aa(a,b){return(((a^b)&4278124286)>>>1)+(a&b)>>>0}function sa(a){if(0<=a&&256>a)return a;if(0>a)return 0;if(255<a)return 255}function eb(a,b){return sa(a+(a-b+.5>>1))}function Ia(a,b,c){return Math.abs(b-c)-Math.abs(a-c)}function cc(a,b,c,d,e,f,g){d=f[g-1];for(c=0;c<e;++c)f[g+c]=d=yb(a[b+c],d)}function Kd(a,b,c,d,e){var f;for(f=0;f<c;++f){var g=a[b+f],h=g>>8&255,k=g&16711935,k=k+((h<<16)+h),k=k&16711935;d[e+f]=(g&4278255360)+k>>>0}}function dc(a,b){b.jd=a>>0&255;b.hd=a>>
8&255;b.ud=a>>16&255}function Ld(a,b,c,d,e,f){var g;for(g=0;g<d;++g){var h=b[c+g],k=h>>>8,l=h>>>16,m=h,l=l+((a.jd<<24>>24)*(k<<24>>24)>>>5),l=l&255,m=m+((a.hd<<24>>24)*(k<<24>>24)>>>5),m=m+((a.ud<<24>>24)*(l<<24>>24)>>>5),m=m&255;e[f+g]=(h&4278255360)+(l<<16)+m}}function ec(a,b,c,d,e){self[b]=function(a,b,c,k,l,m,n,r,q){for(k=n;k<r;++k)for(n=0;n<q;++n)l[m++]=e(c[d(a[b++])])};self[a]=function(a,b,h,k,l,m,n){var f=8>>a.b,g=a.Ea,t=a.K[0],v=a.w;if(8>f)for(a=(1<<a.b)-1,v=(1<<f)-1;b<h;++b){var p=0,u;for(u=
0;u<g;++u)u&a||(p=d(k[l++])),m[n++]=e(t[p&v]),p>>=f}else self["VP8LMapColor"+c](k,l,t,v,m,n,b,h,g)}}function Md(a,b,c,d,e){for(c=b+c;b<c;){var f=a[b++];d[e++]=f>>16&255;d[e++]=f>>8&255;d[e++]=f>>0&255}}function Nd(a,b,c,d,e){for(c=b+c;b<c;){var f=a[b++];d[e++]=f>>16&255;d[e++]=f>>8&255;d[e++]=f>>0&255;d[e++]=f>>24&255}}function Od(a,b,c,d,e){for(c=b+c;b<c;){var f=a[b++],g=f>>16&240|f>>12&15,f=f>>0&240|f>>28&15;d[e++]=g;d[e++]=f}}function Pd(a,b,c,d,e){for(c=b+c;b<c;){var f=a[b++],g=f>>16&248|f>>13&
7,f=f>>5&224|f>>3&31;d[e++]=g;d[e++]=f}}function Qd(a,b,c,d,e){for(c=b+c;b<c;){var f=a[b++];d[e++]=f>>0&255;d[e++]=f>>8&255;d[e++]=f>>16&255}}function fb(a,b,c,d,e,f){if(0==f)for(c=b+c;b<c;)f=a[b++],ra(d,(f[0]>>24|f[1]>>8&65280|f[2]<<8&16711680|f[3]<<24)>>>0),e+=32;else I(d,e,a,b,c)}function gb(a,b){self[b][0]=self[a+"0"];self[b][1]=self[a+"1"];self[b][2]=self[a+"2"];self[b][3]=self[a+"3"];self[b][4]=self[a+"4"];self[b][5]=self[a+"5"];self[b][6]=self[a+"6"];self[b][7]=self[a+"7"];self[b][8]=self[a+
"8"];self[b][9]=self[a+"9"];self[b][10]=self[a+"10"];self[b][11]=self[a+"11"];self[b][12]=self[a+"12"];self[b][13]=self[a+"13"];self[b][14]=self[a+"0"];self[b][15]=self[a+"0"]}function hb(a){return a==zb||a==Ab||a==Ja||a==Bb}function Rd(){this.eb=[];this.size=this.A=this.fb=0}function Sd(){this.y=[];this.f=[];this.ea=[];this.F=[];this.Tc=this.Ed=this.Cd=this.Fd=this.lb=this.Db=this.Ab=this.fa=this.J=this.W=this.N=this.O=0}function Cb(){this.Rd=this.height=this.width=this.S=0;this.f={};this.f.RGBA=
new Rd;this.f.kb=new Sd;this.sd=null}function Td(){this.width=[0];this.height=[0];this.Pd=[0];this.Qd=[0];this.format=[0]}function Ud(){this.Id=this.fd=this.Md=this.hb=this.ib=this.da=this.bd=this.cd=this.j=this.v=this.Da=this.Sd=this.ob=0}function Vd(a){alert("todo:WebPSamplerProcessPlane");return a.T}function Wd(a,b){var c=a.T,d=b.ba.f.RGBA,e=d.eb,f=d.fb+a.ka*d.A,g=P[b.ba.S],h=a.y,k=a.O,l=a.f,m=a.N,n=a.ea,r=a.W,q=b.cc,t=b.dc,v=b.Mc,p=b.Nc,u=a.ka,w=a.ka+a.T,y=a.U,A=y+1>>1;0==u?g(h,k,null,null,l,
m,n,r,l,m,n,r,e,f,null,null,y):(g(b.ec,b.fc,h,k,q,t,v,p,l,m,n,r,e,f-d.A,e,f,y),++c);for(;u+2<w;u+=2)q=l,t=m,v=n,p=r,m+=a.Rc,r+=a.Rc,f+=2*d.A,k+=2*a.fa,g(h,k-a.fa,h,k,q,t,v,p,l,m,n,r,e,f-d.A,e,f,y);k+=a.fa;a.j+w<a.o?(I(b.ec,b.fc,h,k,y),I(b.cc,b.dc,l,m,A),I(b.Mc,b.Nc,n,r,A),c--):w&1||g(h,k,null,null,l,m,n,r,l,m,n,r,e,f+d.A,null,null,y);return c}function Xd(a,b,c){var d=a.F,e=[a.J];if(null!=d){var f=a.U,g=b.ba.S,h=g==ya||g==Ja;b=b.ba.f.RGBA;var k=[0],l=a.ka;k[0]=a.T;a.Kb&&(0==l?--k[0]:(--l,e[0]-=a.width),
a.j+a.ka+a.T==a.o&&(k[0]=a.o-a.j-l));var m=b.eb,l=b.fb+l*b.A;a=fc(d,e[0],a.width,f,k,m,l+(h?0:3),b.A);x(c==k);a&&hb(g)&&za(m,l,h,f,k,b.A)}return 0}function gc(a){var b=a.ma,c=b.ba.S,d=11>c,e=c==Ua||c==Va||c==ya||c==Db||12==c||hb(c);b.memory=null;b.Ib=null;b.Jb=null;b.Nd=null;if(!hc(b.Oa,a,e?11:12))return 0;e&&hb(c)&&ic();if(a.da)alert("todo:use_scaling");else{if(d){if(b.Ib=Vd,a.Kb){c=a.U+1>>1;b.memory=V(a.U+2*c);if(null==b.memory)return 0;b.ec=b.memory;b.fc=0;b.cc=b.ec;b.dc=b.fc+a.U;b.Mc=b.cc;b.Nc=
b.dc+c;b.Ib=Wd;ic()}}else alert("todo:EmitYUV");e&&(b.Jb=Xd,d&&Aa())}if(d&&!jc){for(a=0;256>a;++a)Yd[a]=89858*(a-128)+Ba>>Wa,Zd[a]=-22014*(a-128)+Ba,$d[a]=-45773*(a-128),ae[a]=113618*(a-128)+Ba>>Wa;for(a=ta;a<Eb;++a)b=76283*(a-16)+Ba>>Wa,be[a-ta]=ga(b,255),ce[a-ta]=ga(b+8>>4,15);jc=1}return 1}function kc(a){var b=a.ma,c=a.U,d=a.T;x(!(a.ka&1));if(0>=c||0>=d)return 0;c=b.Ib(a,b);null!=b.Jb&&b.Jb(a,b,c);b.Dc+=c;return 1}function lc(a){a.ma.memory=null}function mc(a,b,c,d){if(47!=D(a,8))return 0;b[0]=
D(a,14)+1;c[0]=D(a,14)+1;d[0]=D(a,1);return 0!=D(a,3)?0:!a.h}function ib(a,b){if(4>a)return a+1;var c=a-2>>1;return(2+(a&1)<<c)+D(b,c)+1}function nc(a,b){if(120<b)return b-120;var c=de[b-1],c=(c>>4)*a+(8-(c&15));return 1<=c?c:1}function ua(a,b,c){var d=pb(c);b+=d&255;var e=a[b].g-8;0<e&&(qb(c,c.u+8),d=pb(c),b+=a[b].value,b+=d&(1<<e)-1);qb(c,c.u+a[b].g);return a[b].value}function ub(a,b,c){c.g+=a.g;c.value+=a.value<<b>>>0;x(8>=c.g);return a.g}function ha(a,b,c){var d=a.xc;b=0==d?0:a.vc[a.md*(c>>d)+
(b>>d)];x(b<a.Wb);return a.Ya[b]}function oc(a,b,c,d){var e=a.ab,f=a.c*b,g=a.C;b=g+b;var h=c,k=d;d=a.Ta;for(c=a.Ua;0<e--;){var l=a.gc[e],m=g,n=b,r=h,q=k,k=d,h=c,t=l.Ea;x(m<n);x(n<=l.nc);switch(l.hc){case 2:pc(r,q,(n-m)*t,k,h);break;case 0:var v=l,p=m,u=n,w=k,y=h,A=v.Ea;0==p&&(ee(r,q,null,null,1,w,y),cc(r,q+1,0,0,A-1,w,y+1),q+=A,y+=A,++p);for(var E=1<<v.b,B=E-1,C=xa(A,v.b),N=v.K,v=v.w+(p>>v.b)*C;p<u;){var z=N,Q=v,S=1;for(fe(r,q,w,y-A,1,w,y);S<A;){var K=qc[z[Q++]>>8&15],D=(S&~B)+E;D>A&&(D=A);K(r,q+
+S,w,y+S-A,D-S,w,y+S);S=D}q+=A;y+=A;++p;p&B||(v+=C)}n!=l.nc&&I(k,h-t,k,h+(n-m-1)*t,t);break;case 1:t=r;u=q;r=l.Ea;q=1<<l.b;w=q-1;y=r&~w;A=r-y;p=xa(r,l.b);E=l.K;for(l=l.w+(m>>l.b)*p;m<n;){B=E;C=l;N=new Jd;v=u+y;for(z=u+r;u<v;)dc(B[C++],N),Fb(N,t,u,q,k,h),u+=q,h+=q;u<z&&(dc(B[C++],N),Fb(N,t,u,A,k,h),u+=A,h+=A);++m;m&w||(l+=p)}break;case 3:if(r==k&&q==h&&0<l.b){y=(n-m)*xa(l.Ea,l.b);t=h+(n-m)*t-y;u=k;r=t;q=k;w=h;A=y;p=[];for(y=A-1;0<=y;--y)p[y]=q[w+y];for(y=A-1;0<=y;--y)u[r+y]=p[y];rc(l,m,n,k,t,k,h)}else rc(l,
m,n,r,q,k,h)}h=d;k=c}k!=c&&I(d,c,h,k,f)}function ge(a,b){var c=a.V,d=a.Ba+a.c*a.C,e=b-a.C;x(b<=a.l.o);x(16>=e);if(0<e){var f=a.l,g=a.Ta,h=a.Ua,k=f.width;oc(a,e,c,d);h=[h];c=a.C;d=b;e=h;x(c<d);x(f.v<f.va);d>f.o&&(d=f.o);if(c<f.j){var l=f.j-c,c=f.j;e[0]+=l*k}c>=d?c=0:(e[0]+=4*f.v,f.ka=c-f.j,f.U=f.va-f.v,f.T=d-c,c=1);if(c){h=h[0];c=a.ca;if(11>c.S){for(var m=c.f.RGBA,d=c.S,e=f.U,f=f.T,l=m.eb,n=m.A,r=f,m=m.fb+a.Ma*m.A;0<r--;){var q=g,t=h,v=e,p=l,u=m;switch(d){case Ca:sc(q,t,v,p,u);break;case Ua:Gb(q,t,
v,p,u);break;case zb:Gb(q,t,v,p,u);za(p,u,0,v,1,0);break;case tc:uc(q,t,v,p,u);break;case Va:fb(q,t,v,p,u,1);break;case Ab:fb(q,t,v,p,u,1);za(p,u,0,v,1,0);break;case ya:fb(q,t,v,p,u,0);break;case Ja:fb(q,t,v,p,u,0);za(p,u,1,v,1,0);break;case Db:Hb(q,t,v,p,u);break;case Bb:Hb(q,t,v,p,u);vc(p,u,v,1,0);break;case wc:xc(q,t,v,p,u);break;default:x(0)}h+=k;m+=n}a.Ma+=f}else alert("todo:EmitRescaledRowsYUVA");x(a.Ma<=c.height)}}a.C=b;x(a.C<=a.i)}function yc(a){var b;if(0<a.ua)return 0;for(b=0;b<a.Wb;++b){var c=
a.Ya[b].G,d=a.Ya[b].H;if(0<c[1][d[1]+0].g||0<c[2][d[2]+0].g||0<c[3][d[3]+0].g)return 0}return 1}function zc(a,b,c,d,e,f){if(0!=a.Z){var g=a.qd,h=a.rd;for(x(null!=ia[a.Z]);b<c;++b)ia[a.Z](g,h,d,e,d,e,f),g=d,h=e,e+=f;a.qd=g;a.rd=h}}function Ib(a,b){var c=a.l.ma,d=0==c.Z||1==c.Z?a.l.j:a.C,d=a.C<d?d:a.C;x(b<=a.l.o);if(b>d){var e=a.l.width,f=c.ca,g=c.tb+e*d,h=a.V,k=a.Ba+a.c*d,l=a.gc;x(1==a.ab);x(3==l[0].hc);he(l[0],d,b,h,k,f,g);zc(c,d,b,f,g,e)}a.C=a.Ma=b}function Jb(a,b,c,d,e,f,g){var h=a.$/d,k=a.$%d,
l=a.m,m=a.s,n=c+a.$,r=n;e=c+d*e;var q=c+d*f,t=280+m.ua,v=a.Pb?h:16777216,p=0<m.ua?m.Wa:null,u=m.wc,w=n<q?ha(m,k,h):null;x(a.C<f);x(q<=e);var y=!1;a:for(;;){for(;y||n<q;){var A=0;if(h>=v){var v=a,E=n-c;x(v.Pb);v.wd=v.m;v.xd=E;0<v.s.ua&&$b(v.s.Wa,v.s.vb);v=h+ie}k&u||(w=ha(m,k,h));x(null!=w);w.Qb&&(b[n]=w.qb,y=!0);if(!y)if(Sa(l),w.jc){var A=l,E=b,B=n,C=w.pd[pb(A)&xb-1];x(w.jc);256>C.g?(qb(A,A.u+C.g),E[B]=C.value,A=0):(qb(A,A.u+C.g-256),x(256<=C.value),A=C.value);0==A&&(y=!0)}else A=ua(w.G[0],w.H[0],
l);if(l.h)break;if(y||256>A){if(!y)if(w.nd)b[n]=(w.qb|A<<8)>>>0;else{Sa(l);y=ua(w.G[1],w.H[1],l);Sa(l);E=ua(w.G[2],w.H[2],l);B=ua(w.G[3],w.H[3],l);if(l.h)break;b[n]=(B<<24|y<<16|A<<8|E)>>>0}y=!1;++n;++k;if(k>=d&&(k=0,++h,null!=g&&h<=f&&!(h%16)&&g(a,h),null!=p))for(;r<n;)A=b[r++],p.X[(506832829*A&4294967295)>>>p.Mb]=A}else if(280>A){A=ib(A-256,l);E=ua(w.G[4],w.H[4],l);Sa(l);E=ib(E,l);E=nc(d,E);if(l.h)break;if(n-c<E||e-n<A)break a;else for(B=0;B<A;++B)b[n+B]=b[n+B-E];n+=A;for(k+=A;k>=d;)k-=d,++h,null!=
g&&h<=f&&!(h%16)&&g(a,h);x(n<=e);k&u&&(w=ha(m,k,h));if(null!=p)for(;r<n;)A=b[r++],p.X[(506832829*A&4294967295)>>>p.Mb]=A}else if(A<t){y=A-280;for(x(null!=p);r<n;)A=b[r++],p.X[(506832829*A&4294967295)>>>p.Mb]=A;A=n;E=p;x(!(y>>>E.Xa));b[A]=E.X[y];y=!0}else break a;y||x(l.h==db(l))}if(a.Pb&&l.h&&n<e)x(a.m.h),a.a=5,a.m=a.wd,a.$=a.xd,0<a.s.ua&&$b(a.s.vb,a.s.Wa);else if(l.h)break a;else null!=g&&g(a,h>f?f:h),a.a=0,a.$=n-c;return 1}a.a=3;return 0}function Ac(a){x(null!=a);a.vc=null;a.yc=null;a.Ya=null;var b=
a.Wa;null!=b&&(b.X=null);a.vb=null;x(null!=a)}function Bc(){var a=new je;if(null==a)return null;a.a=0;a.xb=Cc;gb("Predictor","VP8LPredictors");gb("Predictor","VP8LPredictors_C");gb("PredictorAdd","VP8LPredictorsAdd");gb("PredictorAdd","VP8LPredictorsAdd_C");pc=Kd;Fb=Ld;sc=Md;Gb=Nd;Hb=Od;xc=Pd;uc=Qd;self.VP8LMapColor32b=ke;self.VP8LMapColor8b=le;return a}function rb(a,b,c,d,e){var f=1,g=[a],h=[b],k=d.m,l=d.s,m=null,n=0;a:for(;;){if(c)for(;f&&D(k,1);){var r=g,q=h,t=d,v=1,p=t.m,u=t.gc[t.ab],w=D(p,2);
if(t.Oc&1<<w)f=0;else{t.Oc|=1<<w;u.hc=w;u.Ea=r[0];u.nc=q[0];u.K=[null];++t.ab;x(4>=t.ab);switch(w){case 0:case 1:u.b=D(p,3)+2;v=rb(xa(u.Ea,u.b),xa(u.nc,u.b),0,t,u.K);u.K=u.K[0];break;case 3:var y=D(p,8)+1,A=16<y?0:4<y?1:2<y?2:3;r[0]=xa(u.Ea,A);u.b=A;var v=rb(y,1,0,t,u.K),E;if(E=v){var B,C=y,N=u,z=1<<(8>>N.b),Q=V(z);if(null==Q)E=0;else{var S=N.K[0],K=N.w;Q[0]=N.K[0][0];for(B=1;B<1*C;++B)Q[B]=yb(S[K+B],Q[B-1]);for(;B<4*z;++B)Q[B]=0;N.K[0]=null;N.K[0]=Q;E=1}}v=E;break;case 2:break;default:x(0)}f=v}}g=
g[0];h=h[0];if(f&&D(k,1)&&(n=D(k,4),f=1<=n&&11>=n,!f)){d.a=3;break a}var H;if(H=f)b:{var F=d,G=g,L=h,J=n,T=c,Da,ba,X=F.m,R=F.s,P=[null],U,W=1,aa=0,na=me[J];c:for(;;){if(T&&D(X,1)){var ca=D(X,3)+2,ga=xa(G,ca),ka=xa(L,ca),qa=ga*ka;if(!rb(ga,ka,0,F,P))break c;P=P[0];R.xc=ca;for(Da=0;Da<qa;++Da){var ia=P[Da]>>8&65535;P[Da]=ia;ia>=W&&(W=ia+1)}}if(X.h)break c;for(ba=0;5>ba;++ba){var Y=Dc[ba];!ba&&0<J&&(Y+=1<<J);aa<Y&&(aa=Y)}var ma=wa(W*na,O);var ua=W,va=wa(ua,Ub);if(null==va)var la=null;else x(65536>=ua),
la=va;var ha=V(aa);if(null==la||null==ha||null==ma){F.a=1;break c}var pa=ma;for(Da=U=0;Da<W;++Da){var ja=la[Da],da=ja.G,ea=ja.H,Fa=0,ra=1,Ha=0;for(ba=0;5>ba;++ba){Y=Dc[ba];da[ba]=pa;ea[ba]=U;!ba&&0<J&&(Y+=1<<J);d:{var sa,za=Y,ta=F,oa=ha,db=pa,eb=U,Ia=0,Ka=ta.m,fb=D(Ka,1);M(oa,0,0,za);if(fb){var gb=D(Ka,1)+1,hb=D(Ka,1),Ja=D(Ka,0==hb?1:8);oa[Ja]=1;2==gb&&(Ja=D(Ka,8),oa[Ja]=1);var ya=1}else{var Ua=V(19),Va=D(Ka,4)+4;if(19<Va){ta.a=3;var Aa=0;break d}for(sa=0;sa<Va;++sa)Ua[ne[sa]]=D(Ka,3);var Ba=void 0,
sb=void 0,Wa=ta,ib=Ua,Ca=za,Xa=oa,Oa=0,La=Wa.m,Ya=8,Za=wa(128,O);e:for(;;){if(!Z(Za,0,7,ib,19))break e;if(D(La,1)){var kb=2+2*D(La,3),Ba=2+D(La,kb);if(Ba>Ca)break e}else Ba=Ca;for(sb=0;sb<Ca&&Ba--;){Sa(La);var $a=Za[0+(pb(La)&127)];qb(La,La.u+$a.g);var jb=$a.value;if(16>jb)Xa[sb++]=jb,0!=jb&&(Ya=jb);else{var lb=16==jb,ab=jb-16,mb=oe[ab],bb=D(La,pe[ab])+mb;if(sb+bb>Ca)break e;else for(var nb=lb?Ya:0;0<bb--;)Xa[sb++]=nb}}Oa=1;break e}Oa||(Wa.a=3);ya=Oa}(ya=ya&&!Ka.h)&&(Ia=Z(db,eb,8,oa,za));ya&&0!=Ia?
Aa=Ia:(ta.a=3,Aa=0)}if(0==Aa)break c;ra&&1==qe[ba]&&(ra=0==pa[U].g);Fa+=pa[U].g;U+=Aa;if(3>=ba){var Pa=ha[0],tb;for(tb=1;tb<Y;++tb)ha[tb]>Pa&&(Pa=ha[tb]);Ha+=Pa}}ja.nd=ra;ja.Qb=0;ra&&(ja.qb=(da[3][ea[3]+0].value<<24|da[1][ea[1]+0].value<<16|da[2][ea[2]+0].value)>>>0,0==Fa&&256>da[0][ea[0]+0].value&&(ja.Qb=1,ja.qb+=da[0][ea[0]+0].value<<8));ja.jc=!ja.Qb&&6>Ha;if(ja.jc){var Ga,Ea=ja;for(Ga=0;Ga<xb;++Ga){var Ma=Ga,Na=Ea.pd[Ma],vb=Ea.G[0][Ea.H[0]+Ma];256<=vb.value?(Na.g=vb.g+256,Na.value=vb.value):(Na.g=
0,Na.value=0,Ma>>=ub(vb,8,Na),Ma>>=ub(Ea.G[1][Ea.H[1]+Ma],16,Na),Ma>>=ub(Ea.G[2][Ea.H[2]+Ma],0,Na),ub(Ea.G[3][Ea.H[3]+Ma],24,Na))}}}R.vc=P;R.Wb=W;R.Ya=la;R.yc=ma;H=1;break b}H=0}f=H;if(!f){d.a=3;break a}if(0<n){if(l.ua=1<<n,!Zb(l.Wa,n)){d.a=1;f=0;break a}}else l.ua=0;var Qa=d,cb=g,ob=h,Ra=Qa.s,Ta=Ra.xc;Qa.c=cb;Qa.i=ob;Ra.md=xa(cb,Ta);Ra.wc=0==Ta?-1:(1<<Ta)-1;if(c){d.xb=re;break a}m=V(g*h);if(null==m){d.a=1;f=0;break a}f=(f=Jb(d,m,0,g,h,h,null))&&!k.h;break a}f?(null!=e?e[0]=m:(x(null==m),x(c)),d.$=
0,c||Ac(l)):Ac(l);return f}function Ec(a,b){var c=a.c*a.i,d=c+b+16*b;x(a.c<=b);a.V=V(d);if(null==a.V)return a.Ta=null,a.Ua=0,a.a=1,0;a.Ta=a.V;a.Ua=a.Ba+c+b;return 1}function se(a,b){var c=a.C,d=b-c,e=a.V,f=a.Ba+a.c*c;for(x(b<=a.l.o);0<d;){var g=16<d?16:d,h=a.l.ma,k=a.l.width,l=k*g,m=h.ca,n=h.tb+k*c,r=a.Ta,q=a.Ua;oc(a,g,e,f);Fc(r,q,m,n,l);zc(h,c,c+g,m,n,k);d-=g;e+=g*a.c;c+=g}x(c==b);a.C=a.Ma=b}function te(a,b){var c=[0],d=[0],e=[0];a:for(;;){if(null==a)return 0;if(null==b)return a.a=2,0;a.l=b;a.a=
0;cb(a.m,b.data,b.w,b.ha);if(!mc(a.m,c,d,e)){a.a=3;break a}a.xb=Cc;b.width=c[0];b.height=d[0];if(!rb(c[0],d[0],1,a,null))break a;return 1}x(0!=a.a);return 0}function ue(){this.ub=this.yd=this.td=this.Rb=0}function ve(){this.Kd=this.Ld=this.Ud=this.Td=this.i=this.c=0}function we(){this.Fb=this.Bb=this.Cb=0;this.Zb=V(4);this.Lb=V(4)}function Gc(){this.Yb=wb()}function xe(){this.jb=V(3);this.Wc=Ed([4,8],Gc);this.Xc=Ed([4,17],Gc)}function ye(){this.Pc=this.wb=this.Tb=this.zd=0;this.vd=new V(4);this.od=
new V(4)}function Xa(){this.ld=this.La=this.dd=this.tc=0}function Hc(){this.Na=this.la=0}function ze(){this.Sc=[0,0];this.Eb=[0,0];this.Qc=[0,0];this.ia=this.lc=0}function Kb(){this.ad=V(384);this.Za=0;this.Ob=V(16);this.$b=this.Ad=this.ia=this.Gc=this.Hc=this.Dd=0}function Ae(){this.uc=this.M=this.Nb=0;this.wa=Array(new Xa);this.Y=0;this.ya=Array(new Kb);this.aa=0;this.l=new Oa}function Ic(){this.y=V(16);this.f=V(8);this.ea=V(8)}function Be(){this.cb=this.a=0;this.sc="";this.m=new Wb;this.Od=new ue;
this.Kc=new ve;this.ed=new ye;this.Qa=new we;this.Ic=this.$c=this.Aa=0;this.D=new Ae;this.Xb=this.Va=this.Hb=this.zb=this.yb=this.Ub=this.za=0;this.Jc=wa(8,Wb);this.ia=0;new F;this.pb=wa(4,ze);this.Pa=new xe;this.Bd=this.kc=0;this.Ac=[];this.Bc=0;this.zc=[0,0,0,0];this.Gd=Array(new Ic);this.Hd=0;this.rb=Array(new Hc);this.sb=0;this.wa=Array(new Xa);this.Y=0;this.oc=[];this.pc=0;this.sa=[];this.ta=0;this.qa=[];this.ra=0;this.Ha=[];this.B=this.R=this.Ia=0;this.Ec=[];this.M=this.ja=this.Vb=this.Fc=0;
this.ya=Array(new Kb);this.L=this.aa=0;this.gd=Ed([4,2],Xa);this.ga=null;this.Fa=[];this.Cc=this.qc=this.P=0;this.Gb=[];this.Uc=0;this.mb=[];this.nb=0;this.rc=[];this.Ga=this.Vc=0}function ga(a,b){return 0>a?0:a>b?b:a}function Oa(){this.T=this.U=this.ka=this.height=this.width=0;this.y=[];this.f=[];this.ea=[];this.Rc=this.fa=this.W=this.N=this.O=0;this.ma="void";this.put="VP8IoPutHook";this.ac="VP8IoSetupHook";this.bc="VP8IoTeardownHook";this.ha=this.Kb=0;this.data=[];this.hb=this.ib=this.da=this.o=
this.j=this.va=this.v=this.Da=this.ob=this.w=0;this.F=[];this.J=0}function Ce(){var a=new Be;null!=a&&(a.a=0,a.sc="OK",a.cb=0,a.Xb=0,oa||(oa=De));return a}function T(a,b,c){0==a.a&&(a.a=b,a.sc=c,a.cb=0);return 0}function Jc(a,b,c){return 3<=c&&157==a[b+0]&&1==a[b+1]&&42==a[b+2]}function Kc(a,b){if(null==a)return 0;a.a=0;a.sc="OK";if(null==b)return T(a,2,"null VP8Io passed to VP8GetHeaders()");var c=b.data;var d=b.w;var e=b.ha;if(4>e)return T(a,7,"Truncated header.");var f=c[d+0]|c[d+1]<<8|c[d+2]<<
16;var g=a.Od;g.Rb=!(f&1);g.td=f>>1&7;g.yd=f>>4&1;g.ub=f>>5;if(3<g.td)return T(a,3,"Incorrect keyframe parameters.");if(!g.yd)return T(a,4,"Frame not displayable.");d+=3;e-=3;var h=a.Kc;if(g.Rb){if(7>e)return T(a,7,"cannot parse picture header");if(!Jc(c,d,e))return T(a,3,"Bad code word");h.c=(c[d+4]<<8|c[d+3])&16383;h.Td=c[d+4]>>6;h.i=(c[d+6]<<8|c[d+5])&16383;h.Ud=c[d+6]>>6;d+=7;e-=7;a.za=h.c+15>>4;a.Ub=h.i+15>>4;b.width=h.c;b.height=h.i;b.Da=0;b.j=0;b.v=0;b.va=b.width;b.o=b.height;b.da=0;b.ib=b.width;
b.hb=b.height;b.U=b.width;b.T=b.height;f=a.Pa;M(f.jb,0,255,f.jb.length);f=a.Qa;x(null!=f);f.Cb=0;f.Bb=0;f.Fb=1;M(f.Zb,0,0,f.Zb.length);M(f.Lb,0,0,f.Lb)}if(g.ub>e)return T(a,7,"bad partition length");f=a.m;ma(f,c,d,g.ub);d+=g.ub;e-=g.ub;g.Rb&&(h.Ld=G(f),h.Kd=G(f));h=a.Qa;var k=a.Pa,l;x(null!=f);x(null!=h);h.Cb=G(f);if(h.Cb){h.Bb=G(f);if(G(f)){h.Fb=G(f);for(l=0;4>l;++l)h.Zb[l]=G(f)?ca(f,7):0;for(l=0;4>l;++l)h.Lb[l]=G(f)?ca(f,6):0}if(h.Bb)for(l=0;3>l;++l)k.jb[l]=G(f)?na(f,8):255}else h.Bb=0;if(f.Ka)return T(a,
3,"cannot parse segment header");h=a.ed;h.zd=G(f);h.Tb=na(f,6);h.wb=na(f,3);h.Pc=G(f);if(h.Pc&&G(f)){for(k=0;4>k;++k)G(f)&&(h.vd[k]=ca(f,6));for(k=0;4>k;++k)G(f)&&(h.od[k]=ca(f,6))}a.L=0==h.Tb?0:h.zd?1:2;if(f.Ka)return T(a,3,"cannot parse filter header");l=d;var m=e;e=l;d=l+m;h=m;a.Xb=(1<<na(a.m,2))-1;k=a.Xb;if(m<3*k)c=7;else{l+=3*k;h-=3*k;for(m=0;m<k;++m){var n=c[e+0]|c[e+1]<<8|c[e+2]<<16;n>h&&(n=h);ma(a.Jc[+m],c,l,n);l+=n;h-=n;e+=3}ma(a.Jc[+k],c,l,h);c=l<d?0:5}if(0!=c)return T(a,c,"cannot parse partitions");
l=a.m;c=na(l,7);e=G(l)?ca(l,4):0;d=G(l)?ca(l,4):0;h=G(l)?ca(l,4):0;k=G(l)?ca(l,4):0;l=G(l)?ca(l,4):0;m=a.Qa;for(n=0;4>n;++n){if(m.Cb){var r=m.Zb[n];m.Fb||(r+=c)}else if(0<n){a.pb[n]=a.pb[0];continue}else r=c;var q=a.pb[n];q.Sc[0]=Lb[ga(r+e,127)];q.Sc[1]=Mb[ga(r+0,127)];q.Eb[0]=2*Lb[ga(r+d,127)];q.Eb[1]=101581*Mb[ga(r+h,127)]>>16;8>q.Eb[1]&&(q.Eb[1]=8);q.Qc[0]=Lb[ga(r+k,117)];q.Qc[1]=Mb[ga(r+l,127)];q.lc=r+l}if(!g.Rb)return T(a,4,"Not a key frame.");G(f);g=a.Pa;for(c=0;4>c;++c){for(e=0;8>e;++e)for(d=
0;3>d;++d)for(h=0;11>h;++h)k=K(f,Ee[c][e][d][h])?na(f,8):Fe[c][e][d][h],g.Wc[c][e].Yb[d][h]=k;for(e=0;17>e;++e)g.Xc[c][e]=g.Wc[c][Ge[e]]}a.kc=G(f);a.kc&&(a.Bd=na(f,8));return a.cb=1}function De(a,b,c,d,e,f,g){var h=b[e].Yb[c];for(c=0;16>e;++e){if(!K(a,h[c+0]))return e;for(;!K(a,h[c+1]);)if(h=b[++e].Yb[0],c=0,16==e)return 16;var k=b[e+1].Yb;if(K(a,h[c+2])){var l=a,m=h,n=c;var r=0;if(K(l,m[n+3]))if(K(l,m[n+6])){h=0;r=K(l,m[n+8]);m=K(l,m[n+9+r]);n=2*r+m;r=0;for(m=He[n];m[h];++h)r+=r+K(l,m[h]);r+=3+(8<<
n)}else K(l,m[n+7])?(r=7+2*K(l,165),r+=K(l,145)):r=5+K(l,159);else K(l,m[n+4])?r=3+K(l,m[n+5]):r=2;h=k[2]}else r=1,h=k[1];k=g+Ie[e];l=a;0>l.b&&Qa(l);var m=l.b,n=l.Ca>>1,q=n-(l.I>>m)>>31;--l.b;l.Ca+=q;l.Ca|=1;l.I-=(n+1&q)<<m;f[k]=((r^q)-q)*d[(0<e)+0]}return 16}function Lc(a){var b=a.rb[a.sb-1];b.la=0;b.Na=0;M(a.zc,0,0,a.zc.length);a.ja=0}function Je(a,b){for(a.M=0;a.M<a.Va;++a.M){var c=a.Jc[a.M&a.Xb],d=a.m,e=a,f;for(f=0;f<e.za;++f){var g=d;var h=e;var k=h.Ac,l=h.Bc+4*f,m=h.zc,n=h.ya[h.aa+f];h.Qa.Bb?
n.$b=K(g,h.Pa.jb[0])?2+K(g,h.Pa.jb[2]):K(g,h.Pa.jb[1]):n.$b=0;h.kc&&(n.Ad=K(g,h.Bd));n.Za=!K(g,145)+0;if(n.Za){var r=n.Ob,q=0;for(h=0;4>h;++h){var t=m[0+h];var v;for(v=0;4>v;++v){t=Ke[k[l+v]][t];for(var p=Mc[K(g,t[0])];0<p;)p=Mc[2*p+K(g,t[p])];t=-p;k[l+v]=t}I(r,q,k,l,4);q+=4;m[0+h]=t}}else t=K(g,156)?K(g,128)?1:3:K(g,163)?2:0,n.Ob[0]=t,M(k,l,t,4),M(m,0,t,4);n.Dd=K(g,142)?K(g,114)?K(g,183)?1:3:2:0}if(e.m.Ka)return T(a,7,"Premature end-of-partition0 encountered.");for(;a.ja<a.za;++a.ja){d=a;e=c;g=d.rb[d.sb-
1];k=d.rb[d.sb+d.ja];f=d.ya[d.aa+d.ja];if(l=d.kc?f.Ad:0)g.la=k.la=0,f.Za||(g.Na=k.Na=0),f.Hc=0,f.Gc=0,f.ia=0;else{var u,w,g=k,k=e,l=d.Pa.Xc,m=d.ya[d.aa+d.ja],n=d.pb[m.$b];h=m.ad;r=0;q=d.rb[d.sb-1];t=v=0;M(h,r,0,384);if(m.Za){var y=0;var A=l[3]}else{p=V(16);var E=g.Na+q.Na;E=oa(k,l[1],E,n.Eb,0,p,0);g.Na=q.Na=(0<E)+0;if(1<E)Nc(p,0,h,r);else{var B=p[0]+3>>3;for(p=0;256>p;p+=16)h[r+p]=B}y=1;A=l[0]}var C=g.la&15;var N=q.la&15;for(p=0;4>p;++p){var z=N&1;for(B=w=0;4>B;++B)E=z+(C&1),E=oa(k,A,E,n.Sc,y,h,r),
z=E>y,C=C>>1|z<<7,w=w<<2|(3<E?3:1<E?2:0!=h[r+0]),r+=16;C>>=4;N=N>>1|z<<7;v=(v<<8|w)>>>0}A=C;y=N>>4;for(u=0;4>u;u+=2){w=0;C=g.la>>4+u;N=q.la>>4+u;for(p=0;2>p;++p){z=N&1;for(B=0;2>B;++B)E=z+(C&1),E=oa(k,l[2],E,n.Qc,0,h,r),z=0<E,C=C>>1|z<<3,w=w<<2|(3<E?3:1<E?2:0!=h[r+0]),r+=16;C>>=2;N=N>>1|z<<5}t|=w<<4*u;A|=C<<4<<u;y|=(N&240)<<u}g.la=A;q.la=y;m.Hc=v;m.Gc=t;m.ia=t&43690?0:n.ia;l=!(v|t)}0<d.L&&(d.wa[d.Y+d.ja]=d.gd[f.$b][f.Za],d.wa[d.Y+d.ja].La|=!l);if(e.Ka)return T(a,7,"Premature end-of-file encountered.")}Lc(a);
c=a;d=b;e=1;f=c.D;g=0<c.L&&c.M>=c.zb&&c.M<=c.Va;if(0==c.Aa)a:{f.M=c.M,f.uc=g,Oc(c,f),e=1;w=c.D;f=w.Nb;t=Ya[c.L];g=t*c.R;k=t/2*c.B;p=16*f*c.R;B=8*f*c.B;l=c.sa;m=c.ta-g+p;n=c.qa;h=c.ra-k+B;r=c.Ha;q=c.Ia-k+B;C=w.M;N=0==C;v=C>=c.Va-1;2==c.Aa&&Oc(c,w);if(w.uc)for(E=c,z=E.D.M,x(E.D.uc),w=E.yb;w<E.Hb;++w){var Q=E;y=w;A=z;var S=Q.D,D=S.Nb;u=Q.R;var S=S.wa[S.Y+y],F=Q.sa,H=Q.ta+16*D*u+16*y,J=S.dd,G=S.tc;if(0!=G)if(x(3<=G),1==Q.L)0<y&&Pc(F,H,u,G+4),S.La&&Qc(F,H,u,G),0<A&&Rc(F,H,u,G+4),S.La&&Sc(F,H,u,G);else{var L=
Q.B,O=Q.qa,P=Q.ra+8*D*L+8*y,R=Q.Ha,Q=Q.Ia+8*D*L+8*y,D=S.ld;0<y&&(Tc(F,H,u,G+4,J,D),Uc(O,P,R,Q,L,G+4,J,D));S.La&&(Vc(F,H,u,G,J,D),Wc(O,P,R,Q,L,G,J,D));0<A&&(Xc(F,H,u,G+4,J,D),Yc(O,P,R,Q,L,G+4,J,D));S.La&&(Zc(F,H,u,G,J,D),$c(O,P,R,Q,L,G,J,D))}}c.ia&&alert("todo:DitherRow");if(null!=d.put){w=16*C;C=16*(C+1);N?(d.y=c.sa,d.O=c.ta+p,d.f=c.qa,d.N=c.ra+B,d.ea=c.Ha,d.W=c.Ia+B):(w-=t,d.y=l,d.O=m,d.f=n,d.N=h,d.ea=r,d.W=q);v||(C-=t);C>d.o&&(C=d.o);d.F=null;d.J=null;if(null!=c.Fa&&0<c.Fa.length&&w<C&&(d.J=Le(c,
d,w,C-w),d.F=c.mb,null==d.F&&0==d.F.length)){e=T(c,3,"Could not decode alpha data.");break a}w<d.j&&(t=d.j-w,w=d.j,x(!(t&1)),d.O+=c.R*t,d.N+=c.B*(t>>1),d.W+=c.B*(t>>1),null!=d.F&&(d.J+=d.width*t));w<C&&(d.O+=d.v,d.N+=d.v>>1,d.W+=d.v>>1,null!=d.F&&(d.J+=d.v),d.ka=w-d.j,d.U=d.va-d.v,d.T=C-w,e=d.put(d))}f+1!=c.Ic||v||(I(c.sa,c.ta-g,l,m+16*c.R,g),I(c.qa,c.ra-k,n,h+8*c.B,k),I(c.Ha,c.Ia-k,r,q+8*c.B,k))}if(!e)return T(a,6,"Output aborted.")}return 1}function Me(a,b){if(null==a)return 0;if(null==b)return T(a,
2,"NULL VP8Io parameter in VP8Decode().");if(!a.cb&&!Kc(a,b))return 0;x(a.cb);if(null==b.ac||b.ac(b)){b.ob&&(a.L=0);var c=Ya[a.L];2==a.L?(a.yb=0,a.zb=0):(a.yb=b.v-c>>4,a.zb=b.j-c>>4,0>a.yb&&(a.yb=0),0>a.zb&&(a.zb=0));a.Va=b.o+15+c>>4;a.Hb=b.va+15+c>>4;a.Hb>a.za&&(a.Hb=a.za);a.Va>a.Ub&&(a.Va=a.Ub);if(0<a.L){var d=a.ed;for(c=0;4>c;++c){var e;if(a.Qa.Cb){var f=a.Qa.Lb[c];a.Qa.Fb||(f+=d.Tb)}else f=d.Tb;for(e=0;1>=e;++e){var g=a.gd[c][e],h=f;d.Pc&&(h+=d.vd[0],e&&(h+=d.od[0]));h=0>h?0:63<h?63:h;if(0<h){var k=
h;0<d.wb&&(k=4<d.wb?k>>2:k>>1,k>9-d.wb&&(k=9-d.wb));1>k&&(k=1);g.dd=k;g.tc=2*h+k;g.ld=40<=h?2:15<=h?1:0}else g.tc=0;g.La=e}}}c=0}else T(a,6,"Frame setup failed"),c=a.a;if(c=0==c){if(c){a.$c=0;0<a.Aa||(a.Ic=Ne);b:{c=a.Ic;var k=a.za,d=4*k,l=32*k,m=k+1,n=0<a.L?k*(0<a.Aa?2:1):0,r=(2==a.Aa?2:1)*k;e=3*(16*c+Ya[a.L])/2*l;f=null!=a.Fa&&0<a.Fa.length?a.Kc.c*a.Kc.i:0;g=d+832+e+f;if(g!=g)c=0;else{if(g>a.Vb){a.Vb=0;a.Ec=V(g);a.Fc=0;if(null==a.Ec){c=T(a,1,"no memory during frame initialization.");break b}a.Vb=
g}g=a.Ec;h=a.Fc;a.Ac=g;a.Bc=h;h+=d;a.Gd=wa(l,Ic);a.Hd=0;a.rb=wa(m+1,Hc);a.sb=1;a.wa=n?wa(n,Xa):null;a.Y=0;a.D.Nb=0;a.D.wa=a.wa;a.D.Y=a.Y;0<a.Aa&&(a.D.Y+=k);x(!0);a.oc=g;a.pc=h;h+=832;a.ya=wa(r,Kb);a.aa=0;a.D.ya=a.ya;a.D.aa=a.aa;2==a.Aa&&(a.D.aa+=k);a.R=16*k;a.B=8*k;l=Ya[a.L];k=l*a.R;l=l/2*a.B;a.sa=g;a.ta=h+k;a.qa=a.sa;a.ra=a.ta+16*c*a.R+l;a.Ha=a.qa;a.Ia=a.ra+8*c*a.B+l;a.$c=0;h+=e;a.mb=f?g:null;a.nb=f?h:null;x(h+f<=a.Fc+a.Vb);Lc(a);M(a.Ac,a.Bc,0,d);c=1}}if(c){b.ka=0;b.y=a.sa;b.O=a.ta;b.f=a.qa;b.N=
a.ra;b.ea=a.Ha;b.Vd=a.Ia;b.fa=a.R;b.Rc=a.B;b.F=null;b.J=0;if(!ad){for(c=-255;255>=c;++c)bd[255+c]=0>c?-c:c;for(c=-1020;1020>=c;++c)cd[1020+c]=-128>c?-128:127<c?127:c;for(c=-112;112>=c;++c)dd[112+c]=-16>c?-16:15<c?15:c;for(c=-255;510>=c;++c)ed[255+c]=0>c?0:255<c?255:c;ad=1}Nc=Oe;Za=Pe;Nb=Qe;pa=Re;Ob=Se;fd=Te;Xc=Ue;Tc=Ve;Yc=We;Uc=Xe;Zc=Ye;Vc=Ze;$c=$e;Wc=af;Rc=gd;Pc=hd;Sc=bf;Qc=cf;W[0]=df;W[1]=ef;W[2]=ff;W[3]=gf;W[4]=hf;W[5]=jf;W[6]=kf;W[7]=lf;W[8]=mf;W[9]=nf;Y[0]=of;Y[1]=pf;Y[2]=qf;Y[3]=rf;Y[4]=sf;
Y[5]=tf;Y[6]=uf;ka[0]=vf;ka[1]=wf;ka[2]=xf;ka[3]=yf;ka[4]=zf;ka[5]=Af;ka[6]=Bf;c=1}else c=0}c&&(c=Je(a,b));null!=b.bc&&b.bc(b);c&=1}if(!c)return 0;a.cb=0;return c}function qa(a,b,c,d,e){e=a[b+c+32*d]+(e>>3);a[b+c+32*d]=e&-256?0>e?0:255:e}function kb(a,b,c,d,e,f){qa(a,b,0,c,d+e);qa(a,b,1,c,d+f);qa(a,b,2,c,d-f);qa(a,b,3,c,d-e)}function da(a){return(20091*a>>16)+a}function id(a,b,c,d){var e=0,f;var g=V(16);for(f=0;4>f;++f){var h=a[b+0]+a[b+8];var k=a[b+0]-a[b+8];var l=(35468*a[b+4]>>16)-da(a[b+12]);
var m=da(a[b+4])+(35468*a[b+12]>>16);g[e+0]=h+m;g[e+1]=k+l;g[e+2]=k-l;g[e+3]=h-m;e+=4;b++}for(f=e=0;4>f;++f)a=g[e+0]+4,h=a+g[e+8],k=a-g[e+8],l=(35468*g[e+4]>>16)-da(g[e+12]),m=da(g[e+4])+(35468*g[e+12]>>16),qa(c,d,0,0,h+m),qa(c,d,1,0,k+l),qa(c,d,2,0,k-l),qa(c,d,3,0,h-m),e++,d+=32}function Te(a,b,c,d){var e=a[b+0]+4,f=35468*a[b+4]>>16,g=da(a[b+4]),h=35468*a[b+1]>>16;a=da(a[b+1]);kb(c,d,0,e+g,a,h);kb(c,d,1,e+f,a,h);kb(c,d,2,e-f,a,h);kb(c,d,3,e-g,a,h)}function Pe(a,b,c,d,e){id(a,b,c,d);e&&id(a,b+16,
c,d+4)}function Qe(a,b,c,d){Za(a,b+0,c,d,1);Za(a,b+32,c,d+128,1)}function Re(a,b,c,d){a=a[b+0]+4;var e;for(e=0;4>e;++e)for(b=0;4>b;++b)qa(c,d,b,e,a)}function Se(a,b,c,d){a[b+0]&&pa(a,b+0,c,d);a[b+16]&&pa(a,b+16,c,d+4);a[b+32]&&pa(a,b+32,c,d+128);a[b+48]&&pa(a,b+48,c,d+128+4)}function Oe(a,b,c,d){var e=V(16),f;for(f=0;4>f;++f){var g=a[b+0+f]+a[b+12+f];var h=a[b+4+f]+a[b+8+f];var k=a[b+4+f]-a[b+8+f];var l=a[b+0+f]-a[b+12+f];e[0+f]=g+h;e[8+f]=g-h;e[4+f]=l+k;e[12+f]=l-k}for(f=0;4>f;++f)a=e[0+4*f]+3,g=
a+e[3+4*f],h=e[1+4*f]+e[2+4*f],k=e[1+4*f]-e[2+4*f],l=a-e[3+4*f],c[d+0]=g+h>>3,c[d+16]=l+k>>3,c[d+32]=g-h>>3,c[d+48]=l-k>>3,d+=64}function Pb(a,b,c){var d=b-32,e=R,f=255-a[d-1],g;for(g=0;g<c;++g){var h=e,k=f+a[b-1],l;for(l=0;l<c;++l)a[b+l]=h[k+a[d+l]];b+=32}}function ef(a,b){Pb(a,b,4)}function wf(a,b){Pb(a,b,8)}function pf(a,b){Pb(a,b,16)}function qf(a,b){var c;for(c=0;16>c;++c)I(a,b+32*c,a,b-32,16)}function rf(a,b){var c;for(c=16;0<c;--c)M(a,b,a[b-1],16),b+=32}function $a(a,b,c){var d;for(d=0;16>
d;++d)M(b,c+32*d,a,16)}function of(a,b){var c=16,d;for(d=0;16>d;++d)c+=a[b-1+32*d]+a[b+d-32];$a(c>>5,a,b)}function sf(a,b){var c=8,d;for(d=0;16>d;++d)c+=a[b-1+32*d];$a(c>>4,a,b)}function tf(a,b){var c=8,d;for(d=0;16>d;++d)c+=a[b+d-32];$a(c>>4,a,b)}function uf(a,b){$a(128,a,b)}function z(a,b,c){return a+2*b+c+2>>2}function ff(a,b){var c=b-32,c=new Uint8Array([z(a[c-1],a[c+0],a[c+1]),z(a[c+0],a[c+1],a[c+2]),z(a[c+1],a[c+2],a[c+3]),z(a[c+2],a[c+3],a[c+4])]),d;for(d=0;4>d;++d)I(a,b+32*d,c,0,c.length)}
function gf(a,b){var c=a[b-1],d=a[b-1+32],e=a[b-1+64],f=a[b-1+96];ra(a,b+0,16843009*z(a[b-1-32],c,d));ra(a,b+32,16843009*z(c,d,e));ra(a,b+64,16843009*z(d,e,f));ra(a,b+96,16843009*z(e,f,f))}function df(a,b){var c=4,d;for(d=0;4>d;++d)c+=a[b+d-32]+a[b-1+32*d];c>>=3;for(d=0;4>d;++d)M(a,b+32*d,c,4)}function hf(a,b){var c=a[b-1+0],d=a[b-1+32],e=a[b-1+64],f=a[b-1-32],g=a[b+0-32],h=a[b+1-32],k=a[b+2-32],l=a[b+3-32];a[b+0+96]=z(d,e,a[b-1+96]);a[b+1+96]=a[b+0+64]=z(c,d,e);a[b+2+96]=a[b+1+64]=a[b+0+32]=z(f,
c,d);a[b+3+96]=a[b+2+64]=a[b+1+32]=a[b+0+0]=z(g,f,c);a[b+3+64]=a[b+2+32]=a[b+1+0]=z(h,g,f);a[b+3+32]=a[b+2+0]=z(k,h,g);a[b+3+0]=z(l,k,h)}function kf(a,b){var c=a[b+1-32],d=a[b+2-32],e=a[b+3-32],f=a[b+4-32],g=a[b+5-32],h=a[b+6-32],k=a[b+7-32];a[b+0+0]=z(a[b+0-32],c,d);a[b+1+0]=a[b+0+32]=z(c,d,e);a[b+2+0]=a[b+1+32]=a[b+0+64]=z(d,e,f);a[b+3+0]=a[b+2+32]=a[b+1+64]=a[b+0+96]=z(e,f,g);a[b+3+32]=a[b+2+64]=a[b+1+96]=z(f,g,h);a[b+3+64]=a[b+2+96]=z(g,h,k);a[b+3+96]=z(h,k,k)}function jf(a,b){var c=a[b-1+0],
d=a[b-1+32],e=a[b-1+64],f=a[b-1-32],g=a[b+0-32],h=a[b+1-32],k=a[b+2-32],l=a[b+3-32];a[b+0+0]=a[b+1+64]=f+g+1>>1;a[b+1+0]=a[b+2+64]=g+h+1>>1;a[b+2+0]=a[b+3+64]=h+k+1>>1;a[b+3+0]=k+l+1>>1;a[b+0+96]=z(e,d,c);a[b+0+64]=z(d,c,f);a[b+0+32]=a[b+1+96]=z(c,f,g);a[b+1+32]=a[b+2+96]=z(f,g,h);a[b+2+32]=a[b+3+96]=z(g,h,k);a[b+3+32]=z(h,k,l)}function lf(a,b){var c=a[b+0-32],d=a[b+1-32],e=a[b+2-32],f=a[b+3-32],g=a[b+4-32],h=a[b+5-32],k=a[b+6-32],l=a[b+7-32];a[b+0+0]=c+d+1>>1;a[b+1+0]=a[b+0+64]=d+e+1>>1;a[b+2+0]=
a[b+1+64]=e+f+1>>1;a[b+3+0]=a[b+2+64]=f+g+1>>1;a[b+0+32]=z(c,d,e);a[b+1+32]=a[b+0+96]=z(d,e,f);a[b+2+32]=a[b+1+96]=z(e,f,g);a[b+3+32]=a[b+2+96]=z(f,g,h);a[b+3+64]=z(g,h,k);a[b+3+96]=z(h,k,l)}function nf(a,b){var c=a[b-1+0],d=a[b-1+32],e=a[b-1+64],f=a[b-1+96];a[b+0+0]=c+d+1>>1;a[b+2+0]=a[b+0+32]=d+e+1>>1;a[b+2+32]=a[b+0+64]=e+f+1>>1;a[b+1+0]=z(c,d,e);a[b+3+0]=a[b+1+32]=z(d,e,f);a[b+3+32]=a[b+1+64]=z(e,f,f);a[b+3+64]=a[b+2+64]=a[b+0+96]=a[b+1+96]=a[b+2+96]=a[b+3+96]=f}function mf(a,b){var c=a[b-1+0],
d=a[b-1+32],e=a[b-1+64],f=a[b-1+96],g=a[b-1-32],h=a[b+0-32],k=a[b+1-32],l=a[b+2-32];a[b+0+0]=a[b+2+32]=c+g+1>>1;a[b+0+32]=a[b+2+64]=d+c+1>>1;a[b+0+64]=a[b+2+96]=e+d+1>>1;a[b+0+96]=f+e+1>>1;a[b+3+0]=z(h,k,l);a[b+2+0]=z(g,h,k);a[b+1+0]=a[b+3+32]=z(c,g,h);a[b+1+32]=a[b+3+64]=z(d,c,g);a[b+1+64]=a[b+3+96]=z(e,d,c);a[b+1+96]=z(f,e,d)}function xf(a,b){var c;for(c=0;8>c;++c)I(a,b+32*c,a,b-32,8)}function yf(a,b){var c;for(c=0;8>c;++c)M(a,b,a[b-1],8),b+=32}function lb(a,b,c){var d;for(d=0;8>d;++d)M(b,c+32*
d,a,8)}function vf(a,b){var c=8,d;for(d=0;8>d;++d)c+=a[b+d-32]+a[b-1+32*d];lb(c>>4,a,b)}function Af(a,b){var c=4,d;for(d=0;8>d;++d)c+=a[b+d-32];lb(c>>3,a,b)}function zf(a,b){var c=4,d;for(d=0;8>d;++d)c+=a[b-1+32*d];lb(c>>3,a,b)}function Bf(a,b){lb(128,a,b)}function ab(a,b,c){var d=a[b-c],e=a[b+0],f=3*(e-d)+Qb[1020+a[b-2*c]-a[b+c]],g=mb[112+(f+4>>3)];a[b-c]=R[255+d+mb[112+(f+3>>3)]];a[b+0]=R[255+e-g]}function jd(a,b,c,d){var e=a[b+0],f=a[b+c];return U[255+a[b-2*c]-a[b-c]]>d||U[255+f-e]>d}function kd(a,
b,c,d){return 4*U[255+a[b-c]-a[b+0]]+U[255+a[b-2*c]-a[b+c]]<=d}function ld(a,b,c,d,e){var f=a[b-3*c],g=a[b-2*c],h=a[b-c],k=a[b+0],l=a[b+c],m=a[b+2*c],n=a[b+3*c];return 4*U[255+h-k]+U[255+g-l]>d?0:U[255+a[b-4*c]-f]<=e&&U[255+f-g]<=e&&U[255+g-h]<=e&&U[255+n-m]<=e&&U[255+m-l]<=e&&U[255+l-k]<=e}function gd(a,b,c,d){var e=2*d+1;for(d=0;16>d;++d)kd(a,b+d,c,e)&&ab(a,b+d,c)}function hd(a,b,c,d){var e=2*d+1;for(d=0;16>d;++d)kd(a,b+d*c,1,e)&&ab(a,b+d*c,1)}function bf(a,b,c,d){var e;for(e=3;0<e;--e)b+=4*c,gd(a,
b,c,d)}function cf(a,b,c,d){var e;for(e=3;0<e;--e)b+=4,hd(a,b,c,d)}function ea(a,b,c,d,e,f,g,h){for(f=2*f+1;0<e--;){if(ld(a,b,c,f,g))if(jd(a,b,c,h))ab(a,b,c);else{var k=a,l=b,m=c,n=k[l-2*m],r=k[l-m],q=k[l+0],t=k[l+m],v=k[l+2*m],p=Qb[1020+3*(q-r)+Qb[1020+n-t]],u=27*p+63>>7,w=18*p+63>>7,p=9*p+63>>7;k[l-3*m]=R[255+k[l-3*m]+p];k[l-2*m]=R[255+n+w];k[l-m]=R[255+r+u];k[l+0]=R[255+q-u];k[l+m]=R[255+t-w];k[l+2*m]=R[255+v-p]}b+=d}}function Fa(a,b,c,d,e,f,g,h){for(f=2*f+1;0<e--;){if(ld(a,b,c,f,g))if(jd(a,b,
c,h))ab(a,b,c);else{var k=a,l=b,m=c,n=k[l-m],r=k[l+0],q=k[l+m],t=3*(r-n),v=mb[112+(t+4>>3)],t=mb[112+(t+3>>3)],p=v+1>>1;k[l-2*m]=R[255+k[l-2*m]+p];k[l-m]=R[255+n+t];k[l+0]=R[255+r-v];k[l+m]=R[255+q-p]}b+=d}}function Ue(a,b,c,d,e,f){ea(a,b,c,1,16,d,e,f)}function Ve(a,b,c,d,e,f){ea(a,b,1,c,16,d,e,f)}function Ye(a,b,c,d,e,f){var g;for(g=3;0<g;--g)b+=4*c,Fa(a,b,c,1,16,d,e,f)}function Ze(a,b,c,d,e,f){var g;for(g=3;0<g;--g)b+=4,Fa(a,b,1,c,16,d,e,f)}function We(a,b,c,d,e,f,g,h){ea(a,b,e,1,8,f,g,h);ea(c,
d,e,1,8,f,g,h)}function Xe(a,b,c,d,e,f,g,h){ea(a,b,1,e,8,f,g,h);ea(c,d,1,e,8,f,g,h)}function $e(a,b,c,d,e,f,g,h){Fa(a,b+4*e,e,1,8,f,g,h);Fa(c,d+4*e,e,1,8,f,g,h)}function af(a,b,c,d,e,f,g,h){Fa(a,b+4,1,e,8,f,g,h);Fa(c,d+4,1,e,8,f,g,h)}function Cf(){this.ba=new Cb;this.ec=[];this.cc=[];this.Mc=[];this.Dc=this.Nc=this.dc=this.fc=0;this.Oa=new Ud;this.memory=0;this.Ib="OutputFunc";this.Jb="OutputAlphaFunc";this.Nd="OutputRowFunc"}function md(){this.data=[];this.offset=this.kd=this.ha=this.w=0;this.na=
[];this.xa=this.gb=this.Ja=this.Sa=this.P=0}function Df(){this.nc=this.Ea=this.b=this.hc=0;this.K=[];this.w=0}function Ef(){this.ua=0;this.Wa=new ac;this.vb=new ac;this.md=this.xc=this.wc=0;this.vc=[];this.Wb=0;this.Ya=new Ub;this.yc=new O}function je(){this.xb=this.a=0;this.l=new Oa;this.ca=new Cb;this.V=[];this.Ba=0;this.Ta=[];this.Ua=0;this.m=new Ra;this.Pb=0;this.wd=new Ra;this.Ma=this.$=this.C=this.i=this.c=this.xd=0;this.s=new Ef;this.ab=0;this.gc=wa(4,Df);this.Oc=0}function Ff(){this.Lc=this.Z=
this.$a=this.i=this.c=0;this.l=new Oa;this.ic=0;this.ca=[];this.tb=0;this.qd=null;this.rd=0}function Rb(a,b,c,d,e,f,g){a=null==a?0:a[b+0];for(b=0;b<g;++b)e[f+b]=a+c[d+b]&255,a=e[f+b]}function Gf(a,b,c,d,e,f,g){if(null==a)Rb(null,null,c,d,e,f,g);else{var h;for(h=0;h<g;++h)e[f+h]=a[b+h]+c[d+h]&255}}function Hf(a,b,c,d,e,f,g){if(null==a)Rb(null,null,c,d,e,f,g);else{var h=a[b+0],k=h,l=h,m;for(m=0;m<g;++m)h=a[b+m],k=l+h-k,l=c[d+m]+(k&-256?0>k?0:255:k)&255,k=h,e[f+m]=l}}function Le(a,b,c,d){var e=b.width,
f=b.o;x(null!=a&&null!=b);if(0>c||0>=d||c+d>f)return null;if(!a.Cc){if(null==a.ga){a.ga=new Ff;var g;(g=null==a.ga)||(g=b.width*b.o,x(0==a.Gb.length),a.Gb=V(g),a.Uc=0,null==a.Gb?g=0:(a.mb=a.Gb,a.nb=a.Uc,a.rc=null,g=1),g=!g);if(!g){g=a.ga;var h=a.Fa,k=a.P,l=a.qc,m=a.mb,n=a.nb,r=k+1,q=l-1,t=g.l;x(null!=h&&null!=m&&null!=b);ia[0]=null;ia[1]=Rb;ia[2]=Gf;ia[3]=Hf;g.ca=m;g.tb=n;g.c=b.width;g.i=b.height;x(0<g.c&&0<g.i);if(1>=l)b=0;else if(g.$a=h[k+0]>>0&3,g.Z=h[k+0]>>2&3,g.Lc=h[k+0]>>4&3,k=h[k+0]>>6&3,0>
g.$a||1<g.$a||4<=g.Z||1<g.Lc||k)b=0;else if(t.put=kc,t.ac=gc,t.bc=lc,t.ma=g,t.width=b.width,t.height=b.height,t.Da=b.Da,t.v=b.v,t.va=b.va,t.j=b.j,t.o=b.o,g.$a)b:{x(1==g.$a),b=Bc();c:for(;;){if(null==b){b=0;break b}x(null!=g);g.mc=b;b.c=g.c;b.i=g.i;b.l=g.l;b.l.ma=g;b.l.width=g.c;b.l.height=g.i;b.a=0;cb(b.m,h,r,q);if(!rb(g.c,g.i,1,b,null))break c;1==b.ab&&3==b.gc[0].hc&&yc(b.s)?(g.ic=1,h=b.c*b.i,b.Ta=null,b.Ua=0,b.V=V(h),b.Ba=0,null==b.V?(b.a=1,b=0):b=1):(g.ic=0,b=Ec(b,g.c));if(!b)break c;b=1;break b}g.mc=
null;b=0}else b=q>=g.c*g.i;g=!b}if(g)return null;1!=a.ga.Lc?a.Ga=0:d=f-c}x(null!=a.ga);x(c+d<=f);a:{h=a.ga;b=h.c;f=h.l.o;if(0==h.$a){r=a.rc;q=a.Vc;t=a.Fa;k=a.P+1+c*b;l=a.mb;m=a.nb+c*b;x(k<=a.P+a.qc);if(0!=h.Z)for(x(null!=ia[h.Z]),g=0;g<d;++g)ia[h.Z](r,q,t,k,l,m,b),r=l,q=m,m+=b,k+=b;else for(g=0;g<d;++g)I(l,m,t,k,b),r=l,q=m,m+=b,k+=b;a.rc=r;a.Vc=q}else{x(null!=h.mc);b=c+d;g=h.mc;x(null!=g);x(b<=g.i);if(g.C>=b)b=1;else if(h.ic||Aa(),h.ic){var h=g.V,r=g.Ba,q=g.c,v=g.i,t=1,k=g.$/q,l=g.$%q,m=g.m,n=g.s,
p=g.$,u=q*v,w=q*b,y=n.wc,A=p<w?ha(n,l,k):null;x(p<=u);x(b<=v);x(yc(n));c:for(;;){for(;!m.h&&p<w;){l&y||(A=ha(n,l,k));x(null!=A);Sa(m);v=ua(A.G[0],A.H[0],m);if(256>v)h[r+p]=v,++p,++l,l>=q&&(l=0,++k,k<=b&&!(k%16)&&Ib(g,k));else if(280>v){var v=ib(v-256,m);var E=ua(A.G[4],A.H[4],m);Sa(m);E=ib(E,m);E=nc(q,E);if(p>=E&&u-p>=v){var B;for(B=0;B<v;++B)h[r+p+B]=h[r+p+B-E]}else{t=0;break c}p+=v;for(l+=v;l>=q;)l-=q,++k,k<=b&&!(k%16)&&Ib(g,k);p<w&&l&y&&(A=ha(n,l,k))}else{t=0;break c}x(m.h==db(m))}Ib(g,k>b?b:k);
break c}!t||m.h&&p<u?(t=0,g.a=m.h?5:3):g.$=p;b=t}else b=Jb(g,g.V,g.Ba,g.c,g.i,b,se);if(!b){d=0;break a}}c+d>=f&&(a.Cc=1);d=1}if(!d)return null;if(a.Cc&&(d=a.ga,null!=d&&(d.mc=null),a.ga=null,0<a.Ga))return alert("todo:WebPDequantizeLevels"),null}return a.nb+c*e}function If(a,b,c,d,e,f){for(;0<e--;){var g=a,h=b+(c?1:0),k=a,l=b+(c?0:3),m;for(m=0;m<d;++m){var n=k[l+4*m];255!=n&&(n*=32897,g[h+4*m+0]=g[h+4*m+0]*n>>23,g[h+4*m+1]=g[h+4*m+1]*n>>23,g[h+4*m+2]=g[h+4*m+2]*n>>23)}b+=f}}function Jf(a,b,c,d,e){for(;0<
d--;){var f;for(f=0;f<c;++f){var g=a[b+2*f+0],h=a[b+2*f+1],k=h&15,l=4369*k,h=(h&240|h>>4)*l>>16;a[b+2*f+0]=(g&240|g>>4)*l>>16&240|(g&15|g<<4)*l>>16>>4&15;a[b+2*f+1]=h&240|k}b+=e}}function Kf(a,b,c,d,e,f,g,h){var k=255,l,m;for(m=0;m<e;++m){for(l=0;l<d;++l){var n=a[b+l];f[g+4*l]=n;k&=n}b+=c;g+=h}return 255!=k}function Lf(a,b,c,d,e){var f;for(f=0;f<e;++f)c[d+f]=a[b+f]>>8}function Aa(){za=If;vc=Jf;fc=Kf;Fc=Lf}function va(a,b,c){self[a]=function(a,e,f,g,h,k,l,m,n,r,q,t,v,p,u,w,y){var d,E=y-1>>1;var B=
h[k+0]|l[m+0]<<16;var C=n[r+0]|q[t+0]<<16;x(null!=a);var z=3*B+C+131074>>2;b(a[e+0],z&255,z>>16,v,p);null!=f&&(z=3*C+B+131074>>2,b(f[g+0],z&255,z>>16,u,w));for(d=1;d<=E;++d){var D=h[k+d]|l[m+d]<<16;var G=n[r+d]|q[t+d]<<16;var F=B+D+C+G+524296;var H=F+2*(D+C)>>3;F=F+2*(B+G)>>3;z=H+B>>1;B=F+D>>1;b(a[e+2*d-1],z&255,z>>16,v,p+(2*d-1)*c);b(a[e+2*d-0],B&255,B>>16,v,p+(2*d-0)*c);null!=f&&(z=F+C>>1,B=H+G>>1,b(f[g+2*d-1],z&255,z>>16,u,w+(2*d-1)*c),b(f[g+2*d+0],B&255,B>>16,u,w+(2*d+0)*c));B=D;C=G}y&1||(z=3*
B+C+131074>>2,b(a[e+y-1],z&255,z>>16,v,p+(y-1)*c),null!=f&&(z=3*C+B+131074>>2,b(f[g+y-1],z&255,z>>16,u,w+(y-1)*c)))}}function ic(){P[Ca]=Mf;P[Ua]=nd;P[tc]=Nf;P[Va]=od;P[ya]=pd;P[Db]=qd;P[wc]=Of;P[zb]=nd;P[Ab]=od;P[Ja]=pd;P[Bb]=qd}function Sb(a){return a&~Pf?0>a?0:255:a>>rd}function bb(a,b){return Sb((19077*a>>8)+(26149*b>>8)-14234)}function nb(a,b,c){return Sb((19077*a>>8)-(6419*b>>8)-(13320*c>>8)+8708)}function Pa(a,b){return Sb((19077*a>>8)+(33050*b>>8)-17685)}function Ga(a,b,c,d,e){d[e+0]=bb(a,
c);d[e+1]=nb(a,b,c);d[e+2]=Pa(a,b)}function Tb(a,b,c,d,e){d[e+0]=Pa(a,b);d[e+1]=nb(a,b,c);d[e+2]=bb(a,c)}function sd(a,b,c,d,e){var f=nb(a,b,c);b=f<<3&224|Pa(a,b)>>3;d[e+0]=bb(a,c)&248|f>>5;d[e+1]=b}function td(a,b,c,d,e){var f=Pa(a,b)&240|15;d[e+0]=bb(a,c)&240|nb(a,b,c)>>4;d[e+1]=f}function ud(a,b,c,d,e){d[e+0]=255;Ga(a,b,c,d,e+1)}function vd(a,b,c,d,e){Tb(a,b,c,d,e);d[e+3]=255}function wd(a,b,c,d,e){Ga(a,b,c,d,e);d[e+3]=255}function ga(a,b){return 0>a?0:a>b?b:a}function la(a,b,c){self[a]=function(a,
e,f,g,h,k,l,m,n){for(var d=m+(n&-2)*c;m!=d;)b(a[e+0],f[g+0],h[k+0],l,m),b(a[e+1],f[g+0],h[k+0],l,m+c),e+=2,++g,++k,m+=2*c;n&1&&b(a[e+0],f[g+0],h[k+0],l,m)}}function xd(a,b,c){return 0==c?0==a?0==b?6:5:0==b?4:0:c}function yd(a,b,c,d,e){switch(a>>>30){case 3:Za(b,c,d,e,0);break;case 2:fd(b,c,d,e);break;case 1:pa(b,c,d,e)}}function Oc(a,b){var c,d,e=b.M,f=b.Nb,g=a.oc,h=a.pc+40,k=a.oc,l=a.pc+584,m=a.oc,n=a.pc+600;for(c=0;16>c;++c)g[h+32*c-1]=129;for(c=0;8>c;++c)k[l+32*c-1]=129,m[n+32*c-1]=129;0<e?g[h-
1-32]=k[l-1-32]=m[n-1-32]=129:(M(g,h-32-1,127,21),M(k,l-32-1,127,9),M(m,n-32-1,127,9));for(d=0;d<a.za;++d){var r=b.ya[b.aa+d];if(0<d){for(c=-1;16>c;++c)I(g,h+32*c-4,g,h+32*c+12,4);for(c=-1;8>c;++c)I(k,l+32*c-4,k,l+32*c+4,4),I(m,n+32*c-4,m,n+32*c+4,4)}var q=a.Gd,t=a.Hd+d,v=r.ad,p=r.Hc;0<e&&(I(g,h-32,q[t].y,0,16),I(k,l-32,q[t].f,0,8),I(m,n-32,q[t].ea,0,8));if(r.Za){var u=g;var w=h-32+16;0<e&&(d>=a.za-1?M(u,w,q[t].y[15],4):I(u,w,q[t+1].y,0,4));for(c=0;4>c;c++)u[w+128+c]=u[w+256+c]=u[w+384+c]=u[w+0+c];
for(c=0;16>c;++c,p<<=2)u=g,w=h+zd[c],W[r.Ob[c]](u,w),yd(p,v,16*+c,u,w)}else if(u=xd(d,e,r.Ob[0]),Y[u](g,h),0!=p)for(c=0;16>c;++c,p<<=2)yd(p,v,16*+c,g,h+zd[c]);c=r.Gc;u=xd(d,e,r.Dd);ka[u](k,l);ka[u](m,n);r=c>>0;p=v;u=k;w=l;r&255&&(r&170?Nb(p,256,u,w):Ob(p,256,u,w));c>>=8;r=m;p=n;c&255&&(c&170?Nb(v,320,r,p):Ob(v,320,r,p));e<a.Ub-1&&(I(q[t].y,0,g,h+480,16),I(q[t].f,0,k,l+224,8),I(q[t].ea,0,m,n+224,8));c=8*f*a.B;q=a.sa;t=a.ta+16*d+16*f*a.R;v=a.qa;r=a.ra+8*d+c;p=a.Ha;u=a.Ia+8*d+c;for(c=0;16>c;++c)I(q,
t+c*a.R,g,h+32*c,16);for(c=0;8>c;++c)I(v,r+c*a.B,k,l+32*c,8),I(p,u+c*a.B,m,n+32*c,8)}}function Ad(a,b,c,d,e,f,g,h,k){var l=[0],m=[0],n=0,r=null!=k?k.kd:0,q=null!=k?k:new md;if(null==a||12>c)return 7;q.data=a;q.w=b;q.ha=c;b=[b];c=[c];q.gb=[q.gb];a:{var t=b;var v=c;var p=q.gb;x(null!=a);x(null!=v);x(null!=p);p[0]=0;if(12<=v[0]&&!fa(a,t[0],"RIFF")){if(fa(a,t[0]+8,"WEBP")){p=3;break a}var u=Ha(a,t[0]+4);if(12>u||4294967286<u){p=3;break a}if(r&&u>v[0]-8){p=7;break a}p[0]=u;t[0]+=12;v[0]-=12}p=0}if(0!=
p)return p;u=0<q.gb[0];for(c=c[0];;){t=[0];n=[n];a:{var w=a;v=b;p=c;var y=n,A=l,z=m,B=t;y[0]=0;if(8>p[0])p=7;else{if(!fa(w,v[0],"VP8X")){if(10!=Ha(w,v[0]+4)){p=3;break a}if(18>p[0]){p=7;break a}var C=Ha(w,v[0]+8);var D=1+Yb(w,v[0]+12);w=1+Yb(w,v[0]+15);if(2147483648<=D*w){p=3;break a}null!=B&&(B[0]=C);null!=A&&(A[0]=D);null!=z&&(z[0]=w);v[0]+=18;p[0]-=18;y[0]=1}p=0}}n=n[0];t=t[0];if(0!=p)return p;v=!!(t&2);if(!u&&n)return 3;null!=f&&(f[0]=!!(t&16));null!=g&&(g[0]=v);null!=h&&(h[0]=0);g=l[0];t=m[0];
if(n&&v&&null==k){p=0;break}if(4>c){p=7;break}if(u&&n||!u&&!n&&!fa(a,b[0],"ALPH")){c=[c];q.na=[q.na];q.P=[q.P];q.Sa=[q.Sa];a:{C=a;p=b;u=c;var y=q.gb,A=q.na,z=q.P,B=q.Sa;D=22;x(null!=C);x(null!=u);w=p[0];var F=u[0];x(null!=A);x(null!=B);A[0]=null;z[0]=null;for(B[0]=0;;){p[0]=w;u[0]=F;if(8>F){p=7;break a}var G=Ha(C,w+4);if(4294967286<G){p=3;break a}var H=8+G+1&-2;D+=H;if(0<y&&D>y){p=3;break a}if(!fa(C,w,"VP8 ")||!fa(C,w,"VP8L")){p=0;break a}if(F[0]<H){p=7;break a}fa(C,w,"ALPH")||(A[0]=C,z[0]=w+8,B[0]=
G);w+=H;F-=H}}c=c[0];q.na=q.na[0];q.P=q.P[0];q.Sa=q.Sa[0];if(0!=p)break}c=[c];q.Ja=[q.Ja];q.xa=[q.xa];a:if(y=a,p=b,u=c,A=q.gb[0],z=q.Ja,B=q.xa,C=p[0],w=!fa(y,C,"VP8 "),D=!fa(y,C,"VP8L"),x(null!=y),x(null!=u),x(null!=z),x(null!=B),8>u[0])p=7;else{if(w||D){y=Ha(y,C+4);if(12<=A&&y>A-12){p=3;break a}if(r&&y>u[0]-8){p=7;break a}z[0]=y;p[0]+=8;u[0]-=8;B[0]=D}else B[0]=5<=u[0]&&47==y[C+0]&&!(y[C+4]>>5),z[0]=u[0];p=0}c=c[0];q.Ja=q.Ja[0];q.xa=q.xa[0];b=b[0];if(0!=p)break;if(4294967286<q.Ja)return 3;null==
h||v||(h[0]=q.xa?2:1);g=[g];t=[t];if(q.xa){if(5>c){p=7;break}h=g;r=t;v=f;null==a||5>c?a=0:5<=c&&47==a[b+0]&&!(a[b+4]>>5)?(u=[0],y=[0],A=[0],z=new Ra,cb(z,a,b,c),mc(z,u,y,A)?(null!=h&&(h[0]=u[0]),null!=r&&(r[0]=y[0]),null!=v&&(v[0]=A[0]),a=1):a=0):a=0}else{if(10>c){p=7;break}h=t;null==a||10>c||!Jc(a,b+3,c-3)?a=0:(r=a[b+0]|a[b+1]<<8|a[b+2]<<16,v=(a[b+7]<<8|a[b+6])&16383,a=(a[b+9]<<8|a[b+8])&16383,r&1||3<(r>>1&7)||!(r>>4&1)||r>>5>=q.Ja||!v||!a?a=0:(g&&(g[0]=v),h&&(h[0]=a),a=1))}if(!a)return 3;g=g[0];
t=t[0];if(n&&(l[0]!=g||m[0]!=t))return 3;null!=k&&(k[0]=q,k.offset=b-k.w,x(4294967286>b-k.w),x(k.offset==k.ha-c));break}return 0==p||7==p&&n&&null==k?(null!=f&&(f[0]|=null!=q.na&&0<q.na.length),null!=d&&(d[0]=g),null!=e&&(e[0]=t),0):p}function hc(a,b,c){var d=b.width,e=b.height,f=0,g=0,h=d,k=e;b.Da=null!=a&&0<a.Da;if(b.Da&&(h=a.cd,k=a.bd,f=a.v,g=a.j,11>c||(f&=-2,g&=-2),0>f||0>g||0>=h||0>=k||f+h>d||g+k>e))return 0;b.v=f;b.j=g;b.va=f+h;b.o=g+k;b.U=h;b.T=k;b.da=null!=a&&0<a.da;if(b.da){c=[a.ib];f=[a.hb];
if(!bc(h,k,c,f))return 0;b.ib=c[0];b.hb=f[0]}b.ob=null!=a&&a.ob;b.Kb=null==a||!a.Sd;b.da&&(b.ob=b.ib<3*d/4&&b.hb<3*e/4,b.Kb=0);return 1}function Bd(a){if(null==a)return 2;if(11>a.S){var b=a.f.RGBA;b.fb+=(a.height-1)*b.A;b.A=-b.A}else b=a.f.kb,a=a.height,b.O+=(a-1)*b.fa,b.fa=-b.fa,b.N+=(a-1>>1)*b.Ab,b.Ab=-b.Ab,b.W+=(a-1>>1)*b.Db,b.Db=-b.Db,null!=b.F&&(b.J+=(a-1)*b.lb,b.lb=-b.lb);return 0}function Cd(a,b,c,d){if(null==d||0>=a||0>=b)return 2;if(null!=c){if(c.Da){var e=c.cd,f=c.bd,g=c.v&-2,h=c.j&-2;if(0>
g||0>h||0>=e||0>=f||g+e>a||h+f>b)return 2;a=e;b=f}if(c.da){e=[c.ib];f=[c.hb];if(!bc(a,b,e,f))return 2;a=e[0];b=f[0]}}d.width=a;d.height=b;a:{var k=d.width;var l=d.height;a=d.S;if(0>=k||0>=l||!(a>=Ca&&13>a))a=2;else{if(0>=d.Rd&&null==d.sd){var g=f=e=b=0,h=k*Dd[a],m=h*l;11>a||(b=(k+1)/2,f=(l+1)/2*b,12==a&&(e=k,g=e*l));l=V(m+2*f+g);if(null==l){a=1;break a}d.sd=l;11>a?(k=d.f.RGBA,k.eb=l,k.fb=0,k.A=h,k.size=m):(k=d.f.kb,k.y=l,k.O=0,k.fa=h,k.Fd=m,k.f=l,k.N=0+m,k.Ab=b,k.Cd=f,k.ea=l,k.W=0+m+f,k.Db=b,k.Ed=
f,12==a&&(k.F=l,k.J=0+m+2*f),k.Tc=g,k.lb=e)}b=1;e=d.S;f=d.width;g=d.height;if(e>=Ca&&13>e)if(11>e)a=d.f.RGBA,h=Math.abs(a.A),b&=h*(g-1)+f<=a.size,b&=h>=f*Dd[e],b&=null!=a.eb;else{a=d.f.kb;h=(f+1)/2;m=(g+1)/2;k=Math.abs(a.fa);var l=Math.abs(a.Ab),n=Math.abs(a.Db),r=Math.abs(a.lb),q=r*(g-1)+f;b&=k*(g-1)+f<=a.Fd;b&=l*(m-1)+h<=a.Cd;b&=n*(m-1)+h<=a.Ed;b=b&k>=f&l>=h&n>=h;b&=null!=a.y;b&=null!=a.f;b&=null!=a.ea;12==e&&(b&=r>=f,b&=q<=a.Tc,b&=null!=a.F)}else b=0;a=b?0:2}}if(0!=a)return a;null!=c&&c.fd&&(a=
Bd(d));return a}var xb=64,Hd=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535,131071,262143,524287,1048575,2097151,4194303,8388607,16777215],Gd=24,ob=32,Xb=8,Id=[0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];X("Predictor0","PredictorAdd0");self.Predictor0=function(){return 4278190080};self.Predictor1=function(a){return a};self.Predictor2=function(a,b,c){return b[c+0]};self.Predictor3=function(a,b,c){return b[c+1]};self.Predictor4=function(a,b,c){return b[c-1]};self.Predictor5=function(a,b,c){return aa(aa(a,b[c+
1]),b[c+0])};self.Predictor6=function(a,b,c){return aa(a,b[c-1])};self.Predictor7=function(a,b,c){return aa(a,b[c+0])};self.Predictor8=function(a,b,c){return aa(b[c-1],b[c+0])};self.Predictor9=function(a,b,c){return aa(b[c+0],b[c+1])};self.Predictor10=function(a,b,c){return aa(aa(a,b[c-1]),aa(b[c+0],b[c+1]))};self.Predictor11=function(a,b,c){var d=b[c+0];b=b[c-1];return 0>=Ia(d>>24&255,a>>24&255,b>>24&255)+Ia(d>>16&255,a>>16&255,b>>16&255)+Ia(d>>8&255,a>>8&255,b>>8&255)+Ia(d&255,a&255,b&255)?d:a};
self.Predictor12=function(a,b,c){var d=b[c+0];b=b[c-1];return(sa((a>>24&255)+(d>>24&255)-(b>>24&255))<<24|sa((a>>16&255)+(d>>16&255)-(b>>16&255))<<16|sa((a>>8&255)+(d>>8&255)-(b>>8&255))<<8|sa((a&255)+(d&255)-(b&255)))>>>0};self.Predictor13=function(a,b,c){var d=b[c-1];a=aa(a,b[c+0]);return(eb(a>>24&255,d>>24&255)<<24|eb(a>>16&255,d>>16&255)<<16|eb(a>>8&255,d>>8&255)<<8|eb(a>>0&255,d>>0&255))>>>0};var ee=self.PredictorAdd0;self.PredictorAdd1=cc;X("Predictor2","PredictorAdd2");X("Predictor3","PredictorAdd3");
X("Predictor4","PredictorAdd4");X("Predictor5","PredictorAdd5");X("Predictor6","PredictorAdd6");X("Predictor7","PredictorAdd7");X("Predictor8","PredictorAdd8");X("Predictor9","PredictorAdd9");X("Predictor10","PredictorAdd10");X("Predictor11","PredictorAdd11");X("Predictor12","PredictorAdd12");X("Predictor13","PredictorAdd13");var fe=self.PredictorAdd2;ec("ColorIndexInverseTransform","MapARGB","32b",function(a){return a>>8&255},function(a){return a});ec("VP8LColorIndexInverseTransformAlpha","MapAlpha",
"8b",function(a){return a},function(a){return a>>8&255});var rc=self.ColorIndexInverseTransform,ke=self.MapARGB,he=self.VP8LColorIndexInverseTransformAlpha,le=self.MapAlpha,pc,qc=self.VP8LPredictorsAdd=[];qc.length=16;(self.VP8LPredictors=[]).length=16;(self.VP8LPredictorsAdd_C=[]).length=16;(self.VP8LPredictors_C=[]).length=16;var Fb,sc,Gb,Hb,xc,uc,bd=V(511),cd=V(2041),dd=V(225),ed=V(767),ad=0,Qb=cd,mb=dd,R=ed,U=bd,Ca=0,Ua=1,tc=2,Va=3,ya=4,Db=5,wc=6,zb=7,Ab=8,Ja=9,Bb=10,pe=[2,3,7],oe=[3,3,11],Dc=
[280,256,256,256,40],qe=[0,1,1,1,0],ne=[17,18,0,1,2,3,4,5,16,6,7,8,9,10,11,12,13,14,15],de=[24,7,23,25,40,6,39,41,22,26,38,42,56,5,55,57,21,27,54,58,37,43,72,4,71,73,20,28,53,59,70,74,36,44,88,69,75,52,60,3,87,89,19,29,86,90,35,45,68,76,85,91,51,61,104,2,103,105,18,30,102,106,34,46,84,92,67,77,101,107,50,62,120,1,119,121,83,93,17,31,100,108,66,78,118,122,33,47,117,123,49,63,99,109,82,94,0,116,124,65,79,16,32,98,110,48,115,125,81,95,64,114,126,97,111,80,113,127,96,112],me=[2954,2956,2958,2962,2970,
2986,3018,3082,3212,3468,3980,5004],ie=8,Lb=[4,5,6,7,8,9,10,10,11,12,13,14,15,16,17,17,18,19,20,20,21,21,22,22,23,23,24,25,25,26,27,28,29,30,31,32,33,34,35,36,37,37,38,39,40,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,76,77,78,79,80,81,82,83,84,85,86,87,88,89,91,93,95,96,98,100,101,102,104,106,108,110,112,114,116,118,122,124,126,128,130,132,134,136,138,140,143,145,148,151,154,157],Mb=[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,
22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,119,122,125,128,131,134,137,140,143,146,149,152,155,158,161,164,167,170,173,177,181,185,189,193,197,201,205,209,213,217,221,225,229,234,239,245,249,254,259,264,269,274,279,284],oa=null,He=[[173,148,140,0],[176,155,140,135,0],[180,157,141,134,130,0],[254,254,243,230,196,177,153,140,133,130,129,
0]],Ie=[0,1,4,8,5,2,3,6,9,12,13,10,7,11,14,15],Mc=[-0,1,-1,2,-2,3,4,6,-3,5,-4,-5,-6,7,-7,8,-8,-9],Fe=[[[[128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128]],[[253,136,254,255,228,219,128,128,128,128,128],[189,129,242,255,227,213,255,219,128,128,128],[106,126,227,252,214,209,255,255,128,128,128]],[[1,98,248,255,236,226,255,255,128,128,128],[181,133,238,254,221,234,255,154,128,128,128],[78,134,202,247,198,180,255,
219,128,128,128]],[[1,185,249,255,243,255,128,128,128,128,128],[184,150,247,255,236,224,128,128,128,128,128],[77,110,216,255,236,230,128,128,128,128,128]],[[1,101,251,255,241,255,128,128,128,128,128],[170,139,241,252,236,209,255,255,128,128,128],[37,116,196,243,228,255,255,255,128,128,128]],[[1,204,254,255,245,255,128,128,128,128,128],[207,160,250,255,238,128,128,128,128,128,128],[102,103,231,255,211,171,128,128,128,128,128]],[[1,152,252,255,240,255,128,128,128,128,128],[177,135,243,255,234,225,128,
128,128,128,128],[80,129,211,255,194,224,128,128,128,128,128]],[[1,1,255,128,128,128,128,128,128,128,128],[246,1,255,128,128,128,128,128,128,128,128],[255,128,128,128,128,128,128,128,128,128,128]]],[[[198,35,237,223,193,187,162,160,145,155,62],[131,45,198,221,172,176,220,157,252,221,1],[68,47,146,208,149,167,221,162,255,223,128]],[[1,149,241,255,221,224,255,255,128,128,128],[184,141,234,253,222,220,255,199,128,128,128],[81,99,181,242,176,190,249,202,255,255,128]],[[1,129,232,253,214,197,242,196,255,
255,128],[99,121,210,250,201,198,255,202,128,128,128],[23,91,163,242,170,187,247,210,255,255,128]],[[1,200,246,255,234,255,128,128,128,128,128],[109,178,241,255,231,245,255,255,128,128,128],[44,130,201,253,205,192,255,255,128,128,128]],[[1,132,239,251,219,209,255,165,128,128,128],[94,136,225,251,218,190,255,255,128,128,128],[22,100,174,245,186,161,255,199,128,128,128]],[[1,182,249,255,232,235,128,128,128,128,128],[124,143,241,255,227,234,128,128,128,128,128],[35,77,181,251,193,211,255,205,128,128,
128]],[[1,157,247,255,236,231,255,255,128,128,128],[121,141,235,255,225,227,255,255,128,128,128],[45,99,188,251,195,217,255,224,128,128,128]],[[1,1,251,255,213,255,128,128,128,128,128],[203,1,248,255,255,128,128,128,128,128,128],[137,1,177,255,224,255,128,128,128,128,128]]],[[[253,9,248,251,207,208,255,192,128,128,128],[175,13,224,243,193,185,249,198,255,255,128],[73,17,171,221,161,179,236,167,255,234,128]],[[1,95,247,253,212,183,255,255,128,128,128],[239,90,244,250,211,209,255,255,128,128,128],[155,
77,195,248,188,195,255,255,128,128,128]],[[1,24,239,251,218,219,255,205,128,128,128],[201,51,219,255,196,186,128,128,128,128,128],[69,46,190,239,201,218,255,228,128,128,128]],[[1,191,251,255,255,128,128,128,128,128,128],[223,165,249,255,213,255,128,128,128,128,128],[141,124,248,255,255,128,128,128,128,128,128]],[[1,16,248,255,255,128,128,128,128,128,128],[190,36,230,255,236,255,128,128,128,128,128],[149,1,255,128,128,128,128,128,128,128,128]],[[1,226,255,128,128,128,128,128,128,128,128],[247,192,
255,128,128,128,128,128,128,128,128],[240,128,255,128,128,128,128,128,128,128,128]],[[1,134,252,255,255,128,128,128,128,128,128],[213,62,250,255,255,128,128,128,128,128,128],[55,93,255,128,128,128,128,128,128,128,128]],[[128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128]]],[[[202,24,213,235,186,191,220,160,240,175,255],[126,38,182,232,169,184,228,174,255,187,128],[61,46,138,219,151,178,240,170,255,216,128]],[[1,
112,230,250,199,191,247,159,255,255,128],[166,109,228,252,211,215,255,174,128,128,128],[39,77,162,232,172,180,245,178,255,255,128]],[[1,52,220,246,198,199,249,220,255,255,128],[124,74,191,243,183,193,250,221,255,255,128],[24,71,130,219,154,170,243,182,255,255,128]],[[1,182,225,249,219,240,255,224,128,128,128],[149,150,226,252,216,205,255,171,128,128,128],[28,108,170,242,183,194,254,223,255,255,128]],[[1,81,230,252,204,203,255,192,128,128,128],[123,102,209,247,188,196,255,233,128,128,128],[20,95,153,
243,164,173,255,203,128,128,128]],[[1,222,248,255,216,213,128,128,128,128,128],[168,175,246,252,235,205,255,255,128,128,128],[47,116,215,255,211,212,255,255,128,128,128]],[[1,121,236,253,212,214,255,255,128,128,128],[141,84,213,252,201,202,255,219,128,128,128],[42,80,160,240,162,185,255,205,128,128,128]],[[1,1,255,128,128,128,128,128,128,128,128],[244,1,255,128,128,128,128,128,128,128,128],[238,1,255,128,128,128,128,128,128,128,128]]]],Ke=[[[231,120,48,89,115,113,120,152,112],[152,179,64,126,170,
118,46,70,95],[175,69,143,80,85,82,72,155,103],[56,58,10,171,218,189,17,13,152],[114,26,17,163,44,195,21,10,173],[121,24,80,195,26,62,44,64,85],[144,71,10,38,171,213,144,34,26],[170,46,55,19,136,160,33,206,71],[63,20,8,114,114,208,12,9,226],[81,40,11,96,182,84,29,16,36]],[[134,183,89,137,98,101,106,165,148],[72,187,100,130,157,111,32,75,80],[66,102,167,99,74,62,40,234,128],[41,53,9,178,241,141,26,8,107],[74,43,26,146,73,166,49,23,157],[65,38,105,160,51,52,31,115,128],[104,79,12,27,217,255,87,17,7],
[87,68,71,44,114,51,15,186,23],[47,41,14,110,182,183,21,17,194],[66,45,25,102,197,189,23,18,22]],[[88,88,147,150,42,46,45,196,205],[43,97,183,117,85,38,35,179,61],[39,53,200,87,26,21,43,232,171],[56,34,51,104,114,102,29,93,77],[39,28,85,171,58,165,90,98,64],[34,22,116,206,23,34,43,166,73],[107,54,32,26,51,1,81,43,31],[68,25,106,22,64,171,36,225,114],[34,19,21,102,132,188,16,76,124],[62,18,78,95,85,57,50,48,51]],[[193,101,35,159,215,111,89,46,111],[60,148,31,172,219,228,21,18,111],[112,113,77,85,179,
255,38,120,114],[40,42,1,196,245,209,10,25,109],[88,43,29,140,166,213,37,43,154],[61,63,30,155,67,45,68,1,209],[100,80,8,43,154,1,51,26,71],[142,78,78,16,255,128,34,197,171],[41,40,5,102,211,183,4,1,221],[51,50,17,168,209,192,23,25,82]],[[138,31,36,171,27,166,38,44,229],[67,87,58,169,82,115,26,59,179],[63,59,90,180,59,166,93,73,154],[40,40,21,116,143,209,34,39,175],[47,15,16,183,34,223,49,45,183],[46,17,33,183,6,98,15,32,183],[57,46,22,24,128,1,54,17,37],[65,32,73,115,28,128,23,128,205],[40,3,9,115,
51,192,18,6,223],[87,37,9,115,59,77,64,21,47]],[[104,55,44,218,9,54,53,130,226],[64,90,70,205,40,41,23,26,57],[54,57,112,184,5,41,38,166,213],[30,34,26,133,152,116,10,32,134],[39,19,53,221,26,114,32,73,255],[31,9,65,234,2,15,1,118,73],[75,32,12,51,192,255,160,43,51],[88,31,35,67,102,85,55,186,85],[56,21,23,111,59,205,45,37,192],[55,38,70,124,73,102,1,34,98]],[[125,98,42,88,104,85,117,175,82],[95,84,53,89,128,100,113,101,45],[75,79,123,47,51,128,81,171,1],[57,17,5,71,102,57,53,41,49],[38,33,13,121,
57,73,26,1,85],[41,10,67,138,77,110,90,47,114],[115,21,2,10,102,255,166,23,6],[101,29,16,10,85,128,101,196,26],[57,18,10,102,102,213,34,20,43],[117,20,15,36,163,128,68,1,26]],[[102,61,71,37,34,53,31,243,192],[69,60,71,38,73,119,28,222,37],[68,45,128,34,1,47,11,245,171],[62,17,19,70,146,85,55,62,70],[37,43,37,154,100,163,85,160,1],[63,9,92,136,28,64,32,201,85],[75,15,9,9,64,255,184,119,16],[86,6,28,5,64,255,25,248,1],[56,8,17,132,137,255,55,116,128],[58,15,20,82,135,57,26,121,40]],[[164,50,31,137,
154,133,25,35,218],[51,103,44,131,131,123,31,6,158],[86,40,64,135,148,224,45,183,128],[22,26,17,131,240,154,14,1,209],[45,16,21,91,64,222,7,1,197],[56,21,39,155,60,138,23,102,213],[83,12,13,54,192,255,68,47,28],[85,26,85,85,128,128,32,146,171],[18,11,7,63,144,171,4,4,246],[35,27,10,146,174,171,12,26,128]],[[190,80,35,99,180,80,126,54,45],[85,126,47,87,176,51,41,20,32],[101,75,128,139,118,146,116,128,85],[56,41,15,176,236,85,37,9,62],[71,30,17,119,118,255,17,18,138],[101,38,60,138,55,70,43,26,142],
[146,36,19,30,171,255,97,27,20],[138,45,61,62,219,1,81,188,64],[32,41,20,117,151,142,20,21,163],[112,19,12,61,195,128,48,4,24]]],Ee=[[[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[176,246,255,255,255,255,255,255,255,255,255],[223,241,252,255,255,255,255,255,255,255,255],[249,253,253,255,255,255,255,255,255,255,255]],[[255,244,252,255,255,255,255,255,255,255,255],[234,254,254,255,255,255,255,255,255,255,
255],[253,255,255,255,255,255,255,255,255,255,255]],[[255,246,254,255,255,255,255,255,255,255,255],[239,253,254,255,255,255,255,255,255,255,255],[254,255,254,255,255,255,255,255,255,255,255]],[[255,248,254,255,255,255,255,255,255,255,255],[251,255,254,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,253,254,255,255,255,255,255,255,255,255],[251,254,254,255,255,255,255,255,255,255,255],[254,255,254,255,255,255,255,255,255,255,255]],[[255,254,253,255,254,255,255,
255,255,255,255],[250,255,254,255,254,255,255,255,255,255,255],[254,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]]],[[[217,255,255,255,255,255,255,255,255,255,255],[225,252,241,253,255,255,254,255,255,255,255],[234,250,241,250,253,255,253,254,255,255,255]],[[255,254,255,255,255,255,255,255,255,255,255],[223,254,254,255,255,255,255,255,255,255,255],[238,253,254,254,
255,255,255,255,255,255,255]],[[255,248,254,255,255,255,255,255,255,255,255],[249,254,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,253,255,255,255,255,255,255,255,255,255],[247,254,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,253,254,255,255,255,255,255,255,255,255],[252,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,254,254,255,255,255,255,255,255,255,255],[253,
255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,254,253,255,255,255,255,255,255,255,255],[250,255,255,255,255,255,255,255,255,255,255],[254,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]]],[[[186,251,250,255,255,255,255,255,255,255,255],[234,251,244,254,255,255,255,255,255,255,255],[251,251,243,253,254,255,254,255,255,255,
255]],[[255,253,254,255,255,255,255,255,255,255,255],[236,253,254,255,255,255,255,255,255,255,255],[251,253,253,254,254,255,255,255,255,255,255]],[[255,254,254,255,255,255,255,255,255,255,255],[254,254,254,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,254,255,255,255,255,255,255,255,255,255],[254,254,255,255,255,255,255,255,255,255,255],[254,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[254,255,255,255,255,255,255,
255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]]],[[[248,255,255,255,
255,255,255,255,255,255,255],[250,254,252,254,255,255,255,255,255,255,255],[248,254,249,253,255,255,255,255,255,255,255]],[[255,253,253,255,255,255,255,255,255,255,255],[246,253,253,255,255,255,255,255,255,255,255],[252,254,251,254,254,255,255,255,255,255,255]],[[255,254,252,255,255,255,255,255,255,255,255],[248,254,253,255,255,255,255,255,255,255,255],[253,255,254,254,255,255,255,255,255,255,255]],[[255,251,254,255,255,255,255,255,255,255,255],[245,251,254,255,255,255,255,255,255,255,255],[253,253,
254,255,255,255,255,255,255,255,255]],[[255,251,253,255,255,255,255,255,255,255,255],[252,253,254,255,255,255,255,255,255,255,255],[255,254,255,255,255,255,255,255,255,255,255]],[[255,252,255,255,255,255,255,255,255,255,255],[249,255,254,255,255,255,255,255,255,255,255],[255,255,254,255,255,255,255,255,255,255,255]],[[255,255,253,255,255,255,255,255,255,255,255],[250,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]],[[255,255,255,255,255,255,255,255,255,255,255],
[254,255,255,255,255,255,255,255,255,255,255],[255,255,255,255,255,255,255,255,255,255,255]]]],Ge=[0,1,2,3,6,4,5,6,6,6,6,6,6,6,6,7,0],Nc,Y=[],W=[],ka=[],Za,fd,Nb,pa,Ob,Xc,Tc,Yc,Uc,Zc,Vc,$c,Wc,Rc,Pc,Sc,Qc,re=1,Cc=2,ia=[],za,vc,fc,Fc,P=[];va("UpsampleRgbLinePair",Ga,3);va("UpsampleBgrLinePair",Tb,3);va("UpsampleRgbaLinePair",wd,4);va("UpsampleBgraLinePair",vd,4);va("UpsampleArgbLinePair",ud,4);va("UpsampleRgba4444LinePair",td,2);va("UpsampleRgb565LinePair",sd,2);var Mf=window.UpsampleRgbLinePair,Nf=
window.UpsampleBgrLinePair,nd=window.UpsampleRgbaLinePair,od=window.UpsampleBgraLinePair,pd=window.UpsampleArgbLinePair,qd=window.UpsampleRgba4444LinePair,Of=window.UpsampleRgb565LinePair,Wa=16,Ba=1<<Wa-1,ta=-227,Eb=482,rd=6,Pf=(256<<rd)-1,jc=0,Yd=V(256),ae=V(256),$d=V(256),Zd=V(256),be=V(Eb-ta),ce=V(Eb-ta);la("YuvToRgbRow",Ga,3);la("YuvToBgrRow",Tb,3);la("YuvToRgbaRow",wd,4);la("YuvToBgraRow",vd,4);la("YuvToArgbRow",ud,4);la("YuvToRgba4444Row",td,2);la("YuvToRgb565Row",sd,2);var zd=[0,4,8,12,128,
132,136,140,256,260,264,268,384,388,392,396],Ya=[0,2,8],Qf=[8,7,6,4,4,2,2,2,1,1,1,1],Ne=1;this.WebPDecodeRGBA=function(a,b,c,d,e){var f=Ua;var g=new Cf,h=new Cb;g.ba=h;h.S=f;h.width=[h.width];h.height=[h.height];var k=h.width;var l=h.height,m=new Td;if(null==m||null==a)var n=2;else x(null!=m),n=Ad(a,b,c,m.width,m.height,m.Pd,m.Qd,m.format,null);0!=n?k=0:(null!=k&&(k[0]=m.width[0]),null!=l&&(l[0]=m.height[0]),k=1);if(k){h.width=h.width[0];h.height=h.height[0];null!=d&&(d[0]=h.width);null!=e&&(e[0]=
h.height);b:{d=new Oa;e=new md;e.data=a;e.w=b;e.ha=c;e.kd=1;b=[0];x(null!=e);a=Ad(e.data,e.w,e.ha,null,null,null,b,null,e);(0==a||7==a)&&b[0]&&(a=4);b=a;if(0==b){x(null!=g);d.data=e.data;d.w=e.w+e.offset;d.ha=e.ha-e.offset;d.put=kc;d.ac=gc;d.bc=lc;d.ma=g;if(e.xa){a=Bc();if(null==a){g=1;break b}if(te(a,d)){b=Cd(d.width,d.height,g.Oa,g.ba);if(d=0==b){c:{d=a;d:for(;;){if(null==d){d=0;break c}x(null!=d.s.yc);x(null!=d.s.Ya);x(0<d.s.Wb);c=d.l;x(null!=c);e=c.ma;x(null!=e);if(0!=d.xb){d.ca=e.ba;d.tb=e.tb;
x(null!=d.ca);if(!hc(e.Oa,c,Va)){d.a=2;break d}if(!Ec(d,c.width))break d;if(c.da)break d;(c.da||hb(d.ca.S))&&Aa();11>d.ca.S||(alert("todo:WebPInitConvertARGBToYUV"),null!=d.ca.f.kb.F&&Aa());if(d.Pb&&0<d.s.ua&&null==d.s.vb.X&&!Zb(d.s.vb,d.s.Wa.Xa)){d.a=1;break d}d.xb=0}if(!Jb(d,d.V,d.Ba,d.c,d.i,c.o,ge))break d;e.Dc=d.Ma;d=1;break c}x(0!=d.a);d=0}d=!d}d&&(b=a.a)}else b=a.a}else{a=new Ce;if(null==a){g=1;break b}a.Fa=e.na;a.P=e.P;a.qc=e.Sa;if(Kc(a,d)){if(b=Cd(d.width,d.height,g.Oa,g.ba),0==b){a.Aa=0;
c=g.Oa;e=a;x(null!=e);if(null!=c){k=c.Md;k=0>k?0:100<k?255:255*k/100;if(0<k){for(l=m=0;4>l;++l)n=e.pb[l],12>n.lc&&(n.ia=k*Qf[0>n.lc?0:n.lc]>>3),m|=n.ia;m&&(alert("todo:VP8InitRandom"),e.ia=1)}e.Ga=c.Id;100<e.Ga?e.Ga=100:0>e.Ga&&(e.Ga=0)}Me(a,d)||(b=a.a)}}else b=a.a}0==b&&null!=g.Oa&&g.Oa.fd&&(b=Bd(g.ba))}g=b}f=0!=g?null:11>f?h.f.RGBA.eb:h.f.kb.y}else f=null;return f};var Dd=[3,4,3,4,4,2,2,4,4,4,2,1,1]};new window.WebPDecoder;

})();
// (c) Dean McNamee <dean@gmail.com>, 2013.
//
// https://github.com/deanm/omggif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//
// omggif is a JavaScript implementation of a GIF 89a encoder and decoder,
// including animation and compression.  It does not rely on any specific
// underlying system, so should run in the browser, Node, or Plask.

"use strict";

function GifWriter(buf, width, height, gopts) {
  var p = 0;

  var gopts = gopts === undefined ? { } : gopts;
  var loop_count = gopts.loop === undefined ? null : gopts.loop;
  var global_palette = gopts.palette === undefined ? null : gopts.palette;

  if (width <= 0 || height <= 0 || width > 65535 || height > 65535)
    throw new Error("Width/Height invalid.");

  function check_palette_and_num_colors(palette) {
    var num_colors = palette.length;
    if (num_colors < 2 || num_colors > 256 ||  num_colors & (num_colors-1)) {
      throw new Error(
          "Invalid code/color length, must be power of 2 and 2 .. 256.");
    }
    return num_colors;
  }

  // - Header.
  buf[p++] = 0x47; buf[p++] = 0x49; buf[p++] = 0x46;  // GIF
  buf[p++] = 0x38; buf[p++] = 0x39; buf[p++] = 0x61;  // 89a

  // Handling of Global Color Table (palette) and background index.
  var gp_num_colors_pow2 = 0;
  var background = 0;
  if (global_palette !== null) {
    var gp_num_colors = check_palette_and_num_colors(global_palette);
    while (gp_num_colors >>= 1) ++gp_num_colors_pow2;
    gp_num_colors = 1 << gp_num_colors_pow2;
    --gp_num_colors_pow2;
    if (gopts.background !== undefined) {
      background = gopts.background;
      if (background >= gp_num_colors)
        throw new Error("Background index out of range.");
      // The GIF spec states that a background index of 0 should be ignored, so
      // this is probably a mistake and you really want to set it to another
      // slot in the palette.  But actually in the end most browsers, etc end
      // up ignoring this almost completely (including for dispose background).
      if (background === 0)
        throw new Error("Background index explicitly passed as 0.");
    }
  }

  // - Logical Screen Descriptor.
  // NOTE(deanm): w/h apparently ignored by implementations, but set anyway.
  buf[p++] = width & 0xff; buf[p++] = width >> 8 & 0xff;
  buf[p++] = height & 0xff; buf[p++] = height >> 8 & 0xff;
  // NOTE: Indicates 0-bpp original color resolution (unused?).
  buf[p++] = (global_palette !== null ? 0x80 : 0) |  // Global Color Table Flag.
             gp_num_colors_pow2;  // NOTE: No sort flag (unused?).
  buf[p++] = background;  // Background Color Index.
  buf[p++] = 0;  // Pixel aspect ratio (unused?).

  // - Global Color Table
  if (global_palette !== null) {
    for (var i = 0, il = global_palette.length; i < il; ++i) {
      var rgb = global_palette[i];
      buf[p++] = rgb >> 16 & 0xff;
      buf[p++] = rgb >> 8 & 0xff;
      buf[p++] = rgb & 0xff;
    }
  }

  if (loop_count !== null) {  // Netscape block for looping.
    if (loop_count < 0 || loop_count > 65535)
      throw new Error("Loop count invalid.");
    // Extension code, label, and length.
    buf[p++] = 0x21; buf[p++] = 0xff; buf[p++] = 0x0b;
    // NETSCAPE2.0
    buf[p++] = 0x4e; buf[p++] = 0x45; buf[p++] = 0x54; buf[p++] = 0x53;
    buf[p++] = 0x43; buf[p++] = 0x41; buf[p++] = 0x50; buf[p++] = 0x45;
    buf[p++] = 0x32; buf[p++] = 0x2e; buf[p++] = 0x30;
    // Sub-block
    buf[p++] = 0x03; buf[p++] = 0x01;
    buf[p++] = loop_count & 0xff; buf[p++] = loop_count >> 8 & 0xff;
    buf[p++] = 0x00;  // Terminator.
  }


  var ended = false;

  this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
    if (ended === true) { --p; ended = false; }  // Un-end.

    opts = opts === undefined ? { } : opts;

    // TODO(deanm): Bounds check x, y.  Do they need to be within the virtual
    // canvas width/height, I imagine?
    if (x < 0 || y < 0 || x > 65535 || y > 65535)
      throw new Error("x/y invalid.");

    if (w <= 0 || h <= 0 || w > 65535 || h > 65535)
      throw new Error("Width/Height invalid.");

    if (indexed_pixels.length < w * h)
      throw new Error("Not enough pixels for the frame size.");

    var using_local_palette = true;
    var palette = opts.palette;
    if (palette === undefined || palette === null) {
      using_local_palette = false;
      palette = global_palette;
    }

    if (palette === undefined || palette === null)
      throw new Error("Must supply either a local or global palette.");

    var num_colors = check_palette_and_num_colors(palette);

    // Compute the min_code_size (power of 2), destroying num_colors.
    var min_code_size = 0;
    while (num_colors >>= 1) ++min_code_size;
    num_colors = 1 << min_code_size;  // Now we can easily get it back.

    var delay = opts.delay === undefined ? 0 : opts.delay;

    // From the spec:
    //     0 -   No disposal specified. The decoder is
    //           not required to take any action.
    //     1 -   Do not dispose. The graphic is to be left
    //           in place.
    //     2 -   Restore to background color. The area used by the
    //           graphic must be restored to the background color.
    //     3 -   Restore to previous. The decoder is required to
    //           restore the area overwritten by the graphic with
    //           what was there prior to rendering the graphic.
    //  4-7 -    To be defined.
    // NOTE(deanm): Dispose background doesn't really work, apparently most
    // browsers ignore the background palette index and clear to transparency.
    var disposal = opts.disposal === undefined ? 0 : opts.disposal;
    if (disposal < 0 || disposal > 3)  // 4-7 is reserved.
      throw new Error("Disposal out of range.");

    var use_transparency = false;
    var transparent_index = 0;
    if (opts.transparent !== undefined && opts.transparent !== null) {
      use_transparency = true;
      transparent_index = opts.transparent;
      if (transparent_index < 0 || transparent_index >= num_colors)
        throw new Error("Transparent color index.");
    }

    if (disposal !== 0 || use_transparency || delay !== 0) {
      // - Graphics Control Extension
      buf[p++] = 0x21; buf[p++] = 0xf9;  // Extension / Label.
      buf[p++] = 4;  // Byte size.

      buf[p++] = disposal << 2 | (use_transparency === true ? 1 : 0);
      buf[p++] = delay & 0xff; buf[p++] = delay >> 8 & 0xff;
      buf[p++] = transparent_index;  // Transparent color index.
      buf[p++] = 0;  // Block Terminator.
    }

    // - Image Descriptor
    buf[p++] = 0x2c;  // Image Seperator.
    buf[p++] = x & 0xff; buf[p++] = x >> 8 & 0xff;  // Left.
    buf[p++] = y & 0xff; buf[p++] = y >> 8 & 0xff;  // Top.
    buf[p++] = w & 0xff; buf[p++] = w >> 8 & 0xff;
    buf[p++] = h & 0xff; buf[p++] = h >> 8 & 0xff;
    // NOTE: No sort flag (unused?).
    // TODO(deanm): Support interlace.
    buf[p++] = using_local_palette === true ? (0x80 | (min_code_size-1)) : 0;

    // - Local Color Table
    if (using_local_palette === true) {
      for (var i = 0, il = palette.length; i < il; ++i) {
        var rgb = palette[i];
        buf[p++] = rgb >> 16 & 0xff;
        buf[p++] = rgb >> 8 & 0xff;
        buf[p++] = rgb & 0xff;
      }
    }

    p = GifWriterOutputLZWCodeStream(
            buf, p, min_code_size < 2 ? 2 : min_code_size, indexed_pixels);

    return p;
  };

  this.end = function() {
    if (ended === false) {
      buf[p++] = 0x3b;  // Trailer.
      ended = true;
    }
    return p;
  };

  this.getOutputBuffer = function() { return buf; };
  this.setOutputBuffer = function(v) { buf = v; };
  this.getOutputBufferPosition = function() { return p; };
  this.setOutputBufferPosition = function(v) { p = v; };
}

// Main compression routine, palette indexes -> LZW code stream.
// |index_stream| must have at least one entry.
function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
  buf[p++] = min_code_size;
  var cur_subblock = p++;  // Pointing at the length field.

  var clear_code = 1 << min_code_size;
  var code_mask = clear_code - 1;
  var eoi_code = clear_code + 1;
  var next_code = eoi_code + 1;

  var cur_code_size = min_code_size + 1;  // Number of bits per code.
  var cur_shift = 0;
  // We have at most 12-bit codes, so we should have to hold a max of 19
  // bits here (and then we would write out).
  var cur = 0;

  function emit_bytes_to_buffer(bit_block_size) {
    while (cur_shift >= bit_block_size) {
      buf[p++] = cur & 0xff;
      cur >>= 8; cur_shift -= 8;
      if (p === cur_subblock + 256) {  // Finished a subblock.
        buf[cur_subblock] = 255;
        cur_subblock = p++;
      }
    }
  }

  function emit_code(c) {
    cur |= c << cur_shift;
    cur_shift += cur_code_size;
    emit_bytes_to_buffer(8);
  }

  // I am not an expert on the topic, and I don't want to write a thesis.
  // However, it is good to outline here the basic algorithm and the few data
  // structures and optimizations here that make this implementation fast.
  // The basic idea behind LZW is to build a table of previously seen runs
  // addressed by a short id (herein called output code).  All data is
  // referenced by a code, which represents one or more values from the
  // original input stream.  All input bytes can be referenced as the same
  // value as an output code.  So if you didn't want any compression, you
  // could more or less just output the original bytes as codes (there are
  // some details to this, but it is the idea).  In order to achieve
  // compression, values greater then the input range (codes can be up to
  // 12-bit while input only 8-bit) represent a sequence of previously seen
  // inputs.  The decompressor is able to build the same mapping while
  // decoding, so there is always a shared common knowledge between the
  // encoding and decoder, which is also important for "timing" aspects like
  // how to handle variable bit width code encoding.
  //
  // One obvious but very important consequence of the table system is there
  // is always a unique id (at most 12-bits) to map the runs.  'A' might be
  // 4, then 'AA' might be 10, 'AAA' 11, 'AAAA' 12, etc.  This relationship
  // can be used for an effecient lookup strategy for the code mapping.  We
  // need to know if a run has been seen before, and be able to map that run
  // to the output code.  Since we start with known unique ids (input bytes),
  // and then from those build more unique ids (table entries), we can
  // continue this chain (almost like a linked list) to always have small
  // integer values that represent the current byte chains in the encoder.
  // This means instead of tracking the input bytes (AAAABCD) to know our
  // current state, we can track the table entry for AAAABC (it is guaranteed
  // to exist by the nature of the algorithm) and the next character D.
  // Therefor the tuple of (table_entry, byte) is guaranteed to also be
  // unique.  This allows us to create a simple lookup key for mapping input
  // sequences to codes (table indices) without having to store or search
  // any of the code sequences.  So if 'AAAA' has a table entry of 12, the
  // tuple of ('AAAA', K) for any input byte K will be unique, and can be our
  // key.  This leads to a integer value at most 20-bits, which can always
  // fit in an SMI value and be used as a fast sparse array / object key.

  // Output code for the current contents of the index buffer.
  var ib_code = index_stream[0] & code_mask;  // Load first input index.
  var code_table = { };  // Key'd on our 20-bit "tuple".

  emit_code(clear_code);  // Spec says first code should be a clear code.

  // First index already loaded, process the rest of the stream.
  for (var i = 1, il = index_stream.length; i < il; ++i) {
    var k = index_stream[i] & code_mask;
    var cur_key = ib_code << 8 | k;  // (prev, k) unique tuple.
    var cur_code = code_table[cur_key];  // buffer + k.

    // Check if we have to create a new code table entry.
    if (cur_code === undefined) {  // We don't have buffer + k.
      // Emit index buffer (without k).
      // This is an inline version of emit_code, because this is the core
      // writing routine of the compressor (and V8 cannot inline emit_code
      // because it is a closure here in a different context).  Additionally
      // we can call emit_byte_to_buffer less often, because we can have
      // 30-bits (from our 31-bit signed SMI), and we know our codes will only
      // be 12-bits, so can safely have 18-bits there without overflow.
      // emit_code(ib_code);
      cur |= ib_code << cur_shift;
      cur_shift += cur_code_size;
      while (cur_shift >= 8) {
        buf[p++] = cur & 0xff;
        cur >>= 8; cur_shift -= 8;
        if (p === cur_subblock + 256) {  // Finished a subblock.
          buf[cur_subblock] = 255;
          cur_subblock = p++;
        }
      }

      if (next_code === 4096) {  // Table full, need a clear.
        emit_code(clear_code);
        next_code = eoi_code + 1;
        cur_code_size = min_code_size + 1;
        code_table = { };
      } else {  // Table not full, insert a new entry.
        // Increase our variable bit code sizes if necessary.  This is a bit
        // tricky as it is based on "timing" between the encoding and
        // decoder.  From the encoders perspective this should happen after
        // we've already emitted the index buffer and are about to create the
        // first table entry that would overflow our current code bit size.
        if (next_code >= (1 << cur_code_size)) ++cur_code_size;
        code_table[cur_key] = next_code++;  // Insert into code table.
      }

      ib_code = k;  // Index buffer to single input k.
    } else {
      ib_code = cur_code;  // Index buffer to sequence in code table.
    }
  }

  emit_code(ib_code);  // There will still be something in the index buffer.
  emit_code(eoi_code);  // End Of Information.

  // Flush / finalize the sub-blocks stream to the buffer.
  emit_bytes_to_buffer(1);

  // Finish the sub-blocks, writing out any unfinished lengths and
  // terminating with a sub-block of length 0.  If we have already started
  // but not yet used a sub-block it can just become the terminator.
  if (cur_subblock + 1 === p) {  // Started but unused.
    buf[cur_subblock] = 0;
  } else {  // Started and used, write length and additional terminator block.
    buf[cur_subblock] = p - cur_subblock - 1;
    buf[p++] = 0;
  }
  return p;
}

function GifReader(buf) {
  var p = 0;

  // - Header (GIF87a or GIF89a).
  if (buf[p++] !== 0x47 ||            buf[p++] !== 0x49 || buf[p++] !== 0x46 ||
      buf[p++] !== 0x38 || (buf[p++]+1 & 0xfd) !== 0x38 || buf[p++] !== 0x61) {
    throw new Error("Invalid GIF 87a/89a header.");
  }

  // - Logical Screen Descriptor.
  var width = buf[p++] | buf[p++] << 8;
  var height = buf[p++] | buf[p++] << 8;
  var pf0 = buf[p++];  // <Packed Fields>.
  var global_palette_flag = pf0 >> 7;
  var num_global_colors_pow2 = pf0 & 0x7;
  var num_global_colors = 1 << (num_global_colors_pow2 + 1);
  var background = buf[p++];
  buf[p++];  // Pixel aspect ratio (unused?).

  var global_palette_offset = null;
  var global_palette_size   = null;

  if (global_palette_flag) {
    global_palette_offset = p;
    global_palette_size = num_global_colors;
    p += num_global_colors * 3;  // Seek past palette.
  }

  var no_eof = true;

  var frames = [ ];

  var delay = 0;
  var transparent_index = null;
  var disposal = 0;  // 0 - No disposal specified.
  var loop_count = null;

  this.width = width;
  this.height = height;

  while (no_eof && p < buf.length) {
    switch (buf[p++]) {
      case 0x21:  // Graphics Control Extension Block
        switch (buf[p++]) {
          case 0xff:  // Application specific block
            // Try if it's a Netscape block (with animation loop counter).
            if (buf[p   ] !== 0x0b ||  // 21 FF already read, check block size.
                // NETSCAPE2.0
                buf[p+1 ] == 0x4e && buf[p+2 ] == 0x45 && buf[p+3 ] == 0x54 &&
                buf[p+4 ] == 0x53 && buf[p+5 ] == 0x43 && buf[p+6 ] == 0x41 &&
                buf[p+7 ] == 0x50 && buf[p+8 ] == 0x45 && buf[p+9 ] == 0x32 &&
                buf[p+10] == 0x2e && buf[p+11] == 0x30 &&
                // Sub-block
                buf[p+12] == 0x03 && buf[p+13] == 0x01 && buf[p+16] == 0) {
              p += 14;
              loop_count = buf[p++] | buf[p++] << 8;
              p++;  // Skip terminator.
            } else {  // We don't know what it is, just try to get past it.
              p += 12;
              while (true) {  // Seek through subblocks.
                var block_size = buf[p++];
                // Bad block size (ex: undefined from an out of bounds read).
                if (!(block_size >= 0)) throw Error("Invalid block size");
                if (block_size === 0) break;  // 0 size is terminator
                p += block_size;
              }
            }
            break;

          case 0xf9:  // Graphics Control Extension
            if (buf[p++] !== 0x4 || buf[p+4] !== 0)
              throw new Error("Invalid graphics extension block.");
            var pf1 = buf[p++];
            delay = buf[p++] | buf[p++] << 8;
            transparent_index = buf[p++];
            if ((pf1 & 1) === 0) transparent_index = null;
            disposal = pf1 >> 2 & 0x7;
            p++;  // Skip terminator.
            break;

          case 0xfe:  // Comment Extension.
            while (true) {  // Seek through subblocks.
              var block_size = buf[p++];
              // Bad block size (ex: undefined from an out of bounds read).
              if (!(block_size >= 0)) throw Error("Invalid block size");
              if (block_size === 0) break;  // 0 size is terminator
              // console.log(buf.slice(p, p+block_size).toString('ascii'));
              p += block_size;
            }
            break;

          default:
            throw new Error(
                "Unknown graphic control label: 0x" + buf[p-1].toString(16));
        }
        break;

      case 0x2c:  // Image Descriptor.
        var x = buf[p++] | buf[p++] << 8;
        var y = buf[p++] | buf[p++] << 8;
        var w = buf[p++] | buf[p++] << 8;
        var h = buf[p++] | buf[p++] << 8;
        var pf2 = buf[p++];
        var local_palette_flag = pf2 >> 7;
        var interlace_flag = pf2 >> 6 & 1;
        var num_local_colors_pow2 = pf2 & 0x7;
        var num_local_colors = 1 << (num_local_colors_pow2 + 1);
        var palette_offset = global_palette_offset;
        var palette_size = global_palette_size;
        var has_local_palette = false;
        if (local_palette_flag) {
          var has_local_palette = true;
          palette_offset = p;  // Override with local palette.
          palette_size = num_local_colors;
          p += num_local_colors * 3;  // Seek past palette.
        }

        var data_offset = p;

        p++;  // codesize
        while (true) {
          var block_size = buf[p++];
          // Bad block size (ex: undefined from an out of bounds read).
          if (!(block_size >= 0)) throw Error("Invalid block size");
          if (block_size === 0) break;  // 0 size is terminator
          p += block_size;
        }

        frames.push({x: x, y: y, width: w, height: h,
                     has_local_palette: has_local_palette,
                     palette_offset: palette_offset,
                     palette_size: palette_size,
                     data_offset: data_offset,
                     data_length: p - data_offset,
                     transparent_index: transparent_index,
                     interlaced: !!interlace_flag,
                     delay: delay,
                     disposal: disposal});
        break;

      case 0x3b:  // Trailer Marker (end of file).
        no_eof = false;
        break;

      default:
        throw new Error("Unknown gif block: 0x" + buf[p-1].toString(16));
        break;
    }
  }

  this.numFrames = function() {
    return frames.length;
  };

  this.loopCount = function() {
    return loop_count;
  };

  this.frameInfo = function(frame_num) {
    if (frame_num < 0 || frame_num >= frames.length)
      throw new Error("Frame index out of range.");
    return frames[frame_num];
  };

  this.decodeAndBlitFrameBGRA = function(frame_num, pixels) {
    var frame = this.frameInfo(frame_num);
    var num_pixels = frame.width * frame.height;
    var index_stream = new Uint8Array(num_pixels);  // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
        buf, frame.data_offset, index_stream, num_pixels);
    var palette_offset = frame.palette_offset;

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    var trans = frame.transparent_index;
    if (trans === null) trans = 256;

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    var framewidth  = frame.width;
    var framestride = width - framewidth;
    var xleft       = framewidth;  // Number of subrect pixels left in scanline.

    // Output indicies of the top left and bottom right corners of the subrect.
    var opbeg = ((frame.y * width) + frame.x) * 4;
    var opend = ((frame.y + frame.height) * width + frame.x) * 4;
    var op    = opbeg;

    var scanstride = framestride * 4;

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7;  // Pass 1.
    }

    var interlaceskip = 8;  // Tracking the row interval in the current pass.

    for (var i = 0, il = index_stream.length; i < il; ++i) {
      var index = index_stream[i];

      if (xleft === 0) {  // Beginning of new scan line
        op += scanstride;
        xleft = framewidth;
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip-1);
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
          interlaceskip >>= 1;
        }
      }

      if (index === trans) {
        op += 4;
      } else {
        var r = buf[palette_offset + index * 3];
        var g = buf[palette_offset + index * 3 + 1];
        var b = buf[palette_offset + index * 3 + 2];
        pixels[op++] = b;
        pixels[op++] = g;
        pixels[op++] = r;
        pixels[op++] = 255;
      }
      --xleft;
    }
  };

  // I will go to copy and paste hell one day...
  this.decodeAndBlitFrameRGBA = function(frame_num, pixels) {
    var frame = this.frameInfo(frame_num);
    var num_pixels = frame.width * frame.height;
    var index_stream = new Uint8Array(num_pixels);  // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
        buf, frame.data_offset, index_stream, num_pixels);
    var palette_offset = frame.palette_offset;

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    var trans = frame.transparent_index;
    if (trans === null) trans = 256;

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    var framewidth  = frame.width;
    var framestride = width - framewidth;
    var xleft       = framewidth;  // Number of subrect pixels left in scanline.

    // Output indicies of the top left and bottom right corners of the subrect.
    var opbeg = ((frame.y * width) + frame.x) * 4;
    var opend = ((frame.y + frame.height) * width + frame.x) * 4;
    var op    = opbeg;

    var scanstride = framestride * 4;

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7;  // Pass 1.
    }

    var interlaceskip = 8;  // Tracking the row interval in the current pass.

    for (var i = 0, il = index_stream.length; i < il; ++i) {
      var index = index_stream[i];

      if (xleft === 0) {  // Beginning of new scan line
        op += scanstride;
        xleft = framewidth;
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip-1);
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
          interlaceskip >>= 1;
        }
      }

      if (index === trans) {
        op += 4;
      } else {
        var r = buf[palette_offset + index * 3];
        var g = buf[palette_offset + index * 3 + 1];
        var b = buf[palette_offset + index * 3 + 2];
        pixels[op++] = r;
        pixels[op++] = g;
        pixels[op++] = b;
        pixels[op++] = 255;
      }
      --xleft;
    }
  };
}

function GifReaderLZWOutputIndexStream(code_stream, p, output, output_length) {
  var min_code_size = code_stream[p++];

  var clear_code = 1 << min_code_size;
  var eoi_code = clear_code + 1;
  var next_code = eoi_code + 1;

  var cur_code_size = min_code_size + 1;  // Number of bits per code.
  // NOTE: This shares the same name as the encoder, but has a different
  // meaning here.  Here this masks each code coming from the code stream.
  var code_mask = (1 << cur_code_size) - 1;
  var cur_shift = 0;
  var cur = 0;

  var op = 0;  // Output pointer.

  var subblock_size = code_stream[p++];

  // TODO(deanm): Would using a TypedArray be any faster?  At least it would
  // solve the fast mode / backing store uncertainty.
  // var code_table = Array(4096);
  var code_table = new Int32Array(4096);  // Can be signed, we only use 20 bits.

  var prev_code = null;  // Track code-1.

  while (true) {
    // Read up to two bytes, making sure we always 12-bits for max sized code.
    while (cur_shift < 16) {
      if (subblock_size === 0) break;  // No more data to be read.

      cur |= code_stream[p++] << cur_shift;
      cur_shift += 8;

      if (subblock_size === 1) {  // Never let it get to 0 to hold logic above.
        subblock_size = code_stream[p++];  // Next subblock.
      } else {
        --subblock_size;
      }
    }

    // TODO(deanm): We should never really get here, we should have received
    // and EOI.
    if (cur_shift < cur_code_size)
      break;

    var code = cur & code_mask;
    cur >>= cur_code_size;
    cur_shift -= cur_code_size;

    // TODO(deanm): Maybe should check that the first code was a clear code,
    // at least this is what you're supposed to do.  But actually our encoder
    // now doesn't emit a clear code first anyway.
    if (code === clear_code) {
      // We don't actually have to clear the table.  This could be a good idea
      // for greater error checking, but we don't really do any anyway.  We
      // will just track it with next_code and overwrite old entries.

      next_code = eoi_code + 1;
      cur_code_size = min_code_size + 1;
      code_mask = (1 << cur_code_size) - 1;

      // Don't update prev_code ?
      prev_code = null;
      continue;
    } else if (code === eoi_code) {
      break;
    }

    // We have a similar situation as the decoder, where we want to store
    // variable length entries (code table entries), but we want to do in a
    // faster manner than an array of arrays.  The code below stores sort of a
    // linked list within the code table, and then "chases" through it to
    // construct the dictionary entries.  When a new entry is created, just the
    // last byte is stored, and the rest (prefix) of the entry is only
    // referenced by its table entry.  Then the code chases through the
    // prefixes until it reaches a single byte code.  We have to chase twice,
    // first to compute the length, and then to actually copy the data to the
    // output (backwards, since we know the length).  The alternative would be
    // storing something in an intermediate stack, but that doesn't make any
    // more sense.  I implemented an approach where it also stored the length
    // in the code table, although it's a bit tricky because you run out of
    // bits (12 + 12 + 8), but I didn't measure much improvements (the table
    // entries are generally not the long).  Even when I created benchmarks for
    // very long table entries the complexity did not seem worth it.
    // The code table stores the prefix entry in 12 bits and then the suffix
    // byte in 8 bits, so each entry is 20 bits.

    var chase_code = code < next_code ? code : prev_code;

    // Chase what we will output, either {CODE} or {CODE-1}.
    var chase_length = 0;
    var chase = chase_code;
    while (chase > clear_code) {
      chase = code_table[chase] >> 8;
      ++chase_length;
    }

    var k = chase;

    var op_end = op + chase_length + (chase_code !== code ? 1 : 0);
    if (op_end > output_length) {
      console.log("Warning, gif stream longer than expected.");
      return;
    }

    // Already have the first byte from the chase, might as well write it fast.
    output[op++] = k;

    op += chase_length;
    var b = op;  // Track pointer, writing backwards.

    if (chase_code !== code)  // The case of emitting {CODE-1} + k.
      output[op++] = k;

    chase = chase_code;
    while (chase_length--) {
      chase = code_table[chase];
      output[--b] = chase & 0xff;  // Write backwards.
      chase >>= 8;  // Pull down to the prefix code.
    }

    if (prev_code !== null && next_code < 4096) {
      code_table[next_code++] = prev_code << 8 | k;
      // TODO(deanm): Figure out this clearing vs code growth logic better.  I
      // have an feeling that it should just happen somewhere else, for now it
      // is awkward between when we grow past the max and then hit a clear code.
      // For now just check if we hit the max 12-bits (then a clear code should
      // follow, also of course encoded in 12-bits).
      if (next_code >= code_mask+1 && cur_code_size < 12) {
        ++cur_code_size;
        code_mask = code_mask << 1 | 1;
      }
    }

    prev_code = code;
  }

  if (op !== output_length) {
    console.log("Warning, gif stream shorter than expected.");
  }

  return output;
}

// CommonJS.
try { exports.GifWriter = GifWriter; exports.GifReader = GifReader } catch(e) {}
/*
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 *
 * Version 2012-03-09
 *
 * This code was placed in the public domain by its original author,
 * Stefan Gustavson. You may use it as you see fit, but
 * attribution is appreciated.
 *
 */

(function(global){
  var module = global.noise = {};

  function Grad(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  
  Grad.prototype.dot2 = function(x, y) {
    return this.x*x + this.y*y;
  };

  Grad.prototype.dot3 = function(x, y, z) {
    return this.x*x + this.y*y + this.z*z;
  };

  var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
               new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
               new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];

  var p = [151,160,137,91,90,15,
  131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
  190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
  88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
  77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
  102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
  135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
  223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
  129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
  251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
  49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  // To remove the need for index wrapping, double the permutation table length
  var perm = new Array(512);
  var gradP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  module.seed = function(seed) {
    if(seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if(seed < 256) {
      seed |= seed << 8;
    }

    for(var i = 0; i < 256; i++) {
      var v;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed>>8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gradP[i] = gradP[i + 256] = grad3[v % 12];
    }
  };

  module.seed(0);

  /*
  for(var i=0; i<256; i++) {
    perm[i] = perm[i + 256] = p[i];
    gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
  }*/

  // Skewing and unskewing factors for 2, 3, and 4 dimensions
  var F2 = 0.5*(Math.sqrt(3)-1);
  var G2 = (3-Math.sqrt(3))/6;

  var F3 = 1/3;
  var G3 = 1/6;

  // 2D simplex noise
  module.simplex2 = function(xin, yin) {
    var n0, n1, n2; // Noise contributions from the three corners
    // Skew the input space to determine which simplex cell we're in
    var s = (xin+yin)*F2; // Hairy factor for 2D
    var i = Math.floor(xin+s);
    var j = Math.floor(yin+s);
    var t = (i+j)*G2;
    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin-j+t;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if(x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      i1=1; j1=0;
    } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      i1=0; j1=1;
    }
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
    var y2 = y0 - 1 + 2 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    i &= 255;
    j &= 255;
    var gi0 = gradP[i+perm[j]];
    var gi1 = gradP[i+i1+perm[j+j1]];
    var gi2 = gradP[i+1+perm[j+1]];
    // Calculate the contribution from the three corners
    var t0 = 0.5 - x0*x0-y0*y0;
    if(t0<0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.5 - x1*x1-y1*y1;
    if(t1<0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot2(x1, y1);
    }
    var t2 = 0.5 - x2*x2-y2*y2;
    if(t2<0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot2(x2, y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70 * (n0 + n1 + n2);
  };

  // 3D simplex noise
  module.simplex3 = function(xin, yin, zin) {
    var n0, n1, n2, n3; // Noise contributions from the four corners

    // Skew the input space to determine which simplex cell we're in
    var s = (xin+yin+zin)*F3; // Hairy factor for 2D
    var i = Math.floor(xin+s);
    var j = Math.floor(yin+s);
    var k = Math.floor(zin+s);

    var t = (i+j+k)*G3;
    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin-j+t;
    var z0 = zin-k+t;

    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
    // Determine which simplex we are in.
    var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
    var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
    if(x0 >= y0) {
      if(y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if(x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else              { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if(y0 < z0)      { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if(x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else             { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
    // c = 1/6.
    var x1 = x0 - i1 + G3; // Offsets for second corner
    var y1 = y0 - j1 + G3;
    var z1 = z0 - k1 + G3;

    var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
    var y2 = y0 - j2 + 2 * G3;
    var z2 = z0 - k2 + 2 * G3;

    var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
    var y3 = y0 - 1 + 3 * G3;
    var z3 = z0 - 1 + 3 * G3;

    // Work out the hashed gradient indices of the four simplex corners
    i &= 255;
    j &= 255;
    k &= 255;
    var gi0 = gradP[i+   perm[j+   perm[k   ]]];
    var gi1 = gradP[i+i1+perm[j+j1+perm[k+k1]]];
    var gi2 = gradP[i+i2+perm[j+j2+perm[k+k2]]];
    var gi3 = gradP[i+ 1+perm[j+ 1+perm[k+ 1]]];

    // Calculate the contribution from the four corners
    var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if(t0<0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot3(x0, y0, z0);  // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if(t1<0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
    }
    var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if(t2<0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
    }
    var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if(t3<0) {
      n3 = 0;
    } else {
      t3 *= t3;
      n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 32 * (n0 + n1 + n2 + n3);

  };

  // ##### Perlin noise stuff

  function fade(t) {
    return t*t*t*(t*(t*6-15)+10);
  }

  function lerp(a, b, t) {
    return (1-t)*a + t*b;
  }

  // 2D Perlin Noise
  module.perlin2 = function(x, y) {
    // Find unit grid cell containing point
    var X = Math.floor(x), Y = Math.floor(y);
    // Get relative xy coordinates of point within that cell
    x = x - X; y = y - Y;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255; Y = Y & 255;

    // Calculate noise contributions from each of the four corners
    var n00 = gradP[X+perm[Y]].dot2(x, y);
    var n01 = gradP[X+perm[Y+1]].dot2(x, y-1);
    var n10 = gradP[X+1+perm[Y]].dot2(x-1, y);
    var n11 = gradP[X+1+perm[Y+1]].dot2(x-1, y-1);

    // Compute the fade curve value for x
    var u = fade(x);

    // Interpolate the four results
    return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
       fade(y));
  };

  // 3D Perlin Noise
  module.perlin3 = function(x, y, z) {
    // Find unit grid cell containing point
    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    // Get relative xyz coordinates of point within that cell
    x = x - X; y = y - Y; z = z - Z;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255; Y = Y & 255; Z = Z & 255;

    // Calculate noise contributions from each of the eight corners
    var n000 = gradP[X+  perm[Y+  perm[Z  ]]].dot3(x,   y,     z);
    var n001 = gradP[X+  perm[Y+  perm[Z+1]]].dot3(x,   y,   z-1);
    var n010 = gradP[X+  perm[Y+1+perm[Z  ]]].dot3(x,   y-1,   z);
    var n011 = gradP[X+  perm[Y+1+perm[Z+1]]].dot3(x,   y-1, z-1);
    var n100 = gradP[X+1+perm[Y+  perm[Z  ]]].dot3(x-1,   y,   z);
    var n101 = gradP[X+1+perm[Y+  perm[Z+1]]].dot3(x-1,   y, z-1);
    var n110 = gradP[X+1+perm[Y+1+perm[Z  ]]].dot3(x-1, y-1,   z);
    var n111 = gradP[X+1+perm[Y+1+perm[Z+1]]].dot3(x-1, y-1, z-1);

    // Compute the fade curve value for x, y, z
    var u = fade(x);
    var v = fade(y);
    var w = fade(z);

    // Interpolate
    return lerp(
        lerp(
          lerp(n000, n100, u),
          lerp(n001, n101, u), w),
        lerp(
          lerp(n010, n110, u),
          lerp(n011, n111, u), w),
       v);
  };

})(this);
/**
 * Gauss-Jordan elimination
 */

var linear = (function(){
/**
 * Used internally to solve systems
 * If you want to solve A.x = B,
 * choose data=A and mirror=B.
 * mirror can be either an array representing a vector
 * or an array of arrays representing a matrix.
 */
function Mat(data, mirror) {
  // Clone the original matrix
  this.data = new Array(data.length);
  for (var i=0, cols=data[0].length; i<data.length; i++) {
    this.data[i] = new Array(cols);
    for(var j=0; j<cols; j++) {
      this.data[i][j] = data[i][j];
    }
  }

  if (mirror) {
    if (typeof mirror[0] !== "object") {
      for (var i=0; i<mirror.length; i++) {
        mirror[i] = [mirror[i]];
      }
    }
    this.mirror = new Mat(mirror);
  }
}

/**
 * Swap lines i and j in the matrix
 */
Mat.prototype.swap = function (i, j) {
  if (this.mirror) this.mirror.swap(i,j);
  var tmp = this.data[i];
  this.data[i] = this.data[j];
  this.data[j] = tmp;
}

/**
 * Multiply line number i by l
 */
Mat.prototype.multline = function (i, l) {
  if (this.mirror) this.mirror.multline(i,l);
  var line = this.data[i];
  for (var k=line.length-1; k>=0; k--) {
    line[k] *= l;
  }
}

/**
 * Add line number j multiplied by l to line number i
 */
Mat.prototype.addmul = function (i, j, l) {
  if (this.mirror) this.mirror.addmul(i,j,l);
  var lineI = this.data[i], lineJ = this.data[j];
  for (var k=lineI.length-1; k>=0; k--) {
    lineI[k] = lineI[k] + l*lineJ[k];
  }
}

/**
 * Tests if line number i is composed only of zeroes
 */
Mat.prototype.hasNullLine = function (i) {
  for (var j=0; j<this.data[i].length; j++) {
    if (this.data[i][j] !== 0) {
      return false;
    }
  }
  return true;
}

Mat.prototype.gauss = function() {
  var pivot = 0,
      lines = this.data.length,
      columns = this.data[0].length,
      nullLines = [];

  for (var j=0; j<columns; j++) {
    // Find the line on which there is the maximum value of column j
    var maxValue = 0, maxLine = 0;
    for (var k=pivot; k<lines; k++) {
      var val = this.data[k][j];
      if (Math.abs(val) > Math.abs(maxValue)) {
        maxLine = k;
        maxValue = val;
      } 
    }
    if (maxValue === 0) {
      // The matrix is not invertible. The system may still have solutions.
      nullLines.push(pivot);
    } else {
      // The value of the pivot is maxValue
      this.multline(maxLine, 1/maxValue);
      this.swap(maxLine, pivot);
      for (var i=0; i<lines; i++) {
        if (i !== pivot) {
          this.addmul(i, pivot, -this.data[i][j]);
        }
      }
    }
    pivot++;
  }

  // Check that the system has null lines where it should
  for (var i=0; i<nullLines.length; i++) {
    if (!this.mirror.hasNullLine(nullLines[i])) {
      throw new Error("singular matrix");
    }
  }
  return this.mirror.data;
}

/**
 * Solves A.x = b
 * @param A
 * @param b
 * @return x
 */
 var exports = {};
exports.solve = function solve(A, b) {
  var result = new Mat(A,b).gauss();
  if (result.length > 0 && result[0].length === 1) {
    // Convert Nx1 matrices to simple javascript arrays
    for (var i=0; i<result.length; i++) result[i] = result[i][0];
  }
  return result;
}

function identity(n) {
  var id = new Array(n);
  for (var i=0; i<n; i++) {
    id[i] = new Array(n);
    for (var j=0; j<n; j++) {
      id[i][j] = (i === j) ? 1 : 0;
    }
  }
  return id;
}

/**
 * invert a matrix
 */
exports.invert = function invert(A) {
  return new Mat(A, identity(A.length)).gauss();
}

return exports;
})();

var Typr=function(){var i={};i.parse=function(D){var s=function(c,a,N,K){var F=i.B,r=i.T,Q={cmap:r.d,head:r.head,hhea:r.DK,maxp:r.Dq,hmtx:r.Da,name:r.name,"OS/2":r.T,post:r.DE,loca:r.Dp,kern:r.z,glyf:r.f,"CFF ":r.s,"SVG ":r.DL},e={_data:c,_index:a,_offset:N};
for(var $ in Q){var S=i.findTable(c,$,N);if(S){var Y=S[0],w=K[Y];if(w==null)w=Q[$].$(c,Y,S[1],e);e[$]=K[Y]=w}}return e},F=i.B,c=new Uint8Array(D),K={},d=F.Q(c,0,4);
if(d=="ttcf"){var N=4,l=F.K(c,N);N+=2;var f=F.K(c,N);N+=2;var _=F.Y(c,N);N+=4;var P=[];for(var k=0;k<_;
k++){var v=F.Y(c,N);N+=4;P.push(s(c,k,v,K))}return P}else return[s(c,0,0,K)]};i.findTable=function(D,s,F){var c=i.B,K=c.K(D,F+4),d=F+12;
for(var N=0;N<K;N++){var l=c.Q(D,d,4),f=c.Y(D,d+4),_=c.Y(D,d+8),P=c.Y(D,d+12);if(l==s)return[_,P];d+=16}return null};
i.T={};i.B={F:function(D,s){return(D[s]<<8|D[s+1])+(D[s+2]<<8|D[s+3])/(256*256+4)},j:function(D,s){var F=i.B.c(D,s);
return F/16384},n:function(D,s){var F=i.B.H.u;F[0]=D[s+3];F[1]=D[s+2];F[2]=D[s+1];F[3]=D[s];return i.B.H.DJ[0]},o:function(D,s){var F=i.B.H.u;
F[0]=D[s];return i.B.H.sD[0]},c:function(D,s){var F=i.B.H.u;F[1]=D[s];F[0]=D[s+1];return i.B.H.ss[0]},K:function(D,s){return D[s]<<8|D[s+1]},sd:function(D,s,F){D[s]=F>>8&255;
D[s+1]=F&255},DN:function(D,s,F){var c=[];for(var K=0;K<F;K++){var d=i.B.K(D,s+K*2);c.push(d)}return c},Y:function(D,s){var F=i.B.H.u;
F[3]=D[s];F[2]=D[s+1];F[1]=D[s+2];F[0]=D[s+3];return i.B.H.Di[0]},sf:function(D,s,F){D[s]=F>>24&255;
D[s+1]=F>>16&255;D[s+2]=F>>8&255;D[s+3]=F>>0&255},L:function(D,s){return i.B.Y(D,s)*(4294967295+1)+i.B.Y(D,s+4)},Q:function(D,s,F){var c="";
for(var K=0;K<F;K++)c+=String.fromCharCode(D[s+K]);return c},sv:function(D,s,F){for(var c=0;c<F.length;
c++)D[s+c]=F.charCodeAt(c)},_:function(D,s,F){var c="";for(var K=0;K<F;K++){var d=D[s++]<<8|D[s++];c+=String.fromCharCode(d)}return c},DQ:window.TextDecoder?new window.TextDecoder:null,Db:function(D,s,F){var c=i.B.DQ;
if(c&&s==0&&F==D.length)return c.decode(D);return i.B.Q(D,s,F)},p:function(D,s,F){var c=[];for(var K=0;
K<F;K++)c.push(D[s+K]);return c},sa:function(D,s,F){var c=[];for(var K=0;K<F;K++)c.push(String.fromCharCode(D[s+K]));
return c},H:function(){var D=new ArrayBuffer(8);return{Dk:D,sD:new Int8Array(D),u:new Uint8Array(D),ss:new Int16Array(D),Dv:new Uint16Array(D),DJ:new Int32Array(D),Di:new Uint32Array(D)}}()};
i.T.s={$:function(D,s,F){var c=i.B,K=i.T.s;D=new Uint8Array(D.buffer,s,F);s=0;var d=D[s];s++;var N=D[s];
s++;var l=D[s];s++;var f=D[s];s++;var _=[];s=K.b(D,s,_);var P=[];for(var k=0;k<_.length-1;k++)P.push(c.Q(D,s+_[k],_[k+1]-_[k]));
s+=_[_.length-1];var v=[];s=K.b(D,s,v);var a=[];for(var k=0;k<v.length-1;k++)a.push(K.h(D,s+v[k],s+v[k+1]));
s+=v[v.length-1];var r=a[0],Q=[];s=K.b(D,s,Q);var e=[];for(var k=0;k<Q.length-1;k++)e.push(c.Q(D,s+Q[k],Q[k+1]-Q[k]));
s+=Q[Q.length-1];K.W(D,s,r);if(r.CharStrings)r.CharStrings=K.p(D,r.CharStrings);if(r.ROS){s=r.FDArray;
var $=[];s=K.b(D,s,$);r.FDArray=[];for(var k=0;k<$.length-1;k++){var S=K.h(D,s+$[k],s+$[k+1]);K.O(D,S,e);
r.FDArray.push(S)}s+=$[$.length-1];s=r.FDSelect;r.FDSelect=[];var t=D[s];s++;if(t==3){var Y=c.K(D,s);
s+=2;for(var k=0;k<Y+1;k++){r.FDSelect.push(c.K(D,s),D[s+2]);s+=3}}else throw t}if(r.charset)r.charset=K.DU(D,r.charset,r.CharStrings.length);
K.O(D,r,e);return r},O:function(D,s,F){var c=i.T.s,K;if(s.Private){K=s.Private[1];s.Private=c.h(D,K,K+s.Private[0]);
if(s.Private.Subrs)c.W(D,K+s.Private.Subrs,s.Private)}for(var d in s)if("FamilyName FontName FullName Notice version Copyright".split(" ").indexOf(d)!=-1)s[d]=F[s[d]-426+35]},W:function(D,s,F){F.Subrs=i.T.s.p(D,s);
var c,K=F.Subrs.length+1;if(!1)c=0;else if(K<1240)c=107;else if(K<33900)c=1131;else c=32768;F.Bias=c},p:function(D,s){var F=i.B,c=[];
s=i.T.s.b(D,s,c);var K=[],d=c.length-1,N=D.byteOffset+s;for(var l=0;l<d;l++){var f=c[l];K.push(new Uint8Array(D.buffer,N+f,c[l+1]-f))}return K},Dh:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,0,111,112,113,114,0,115,116,117,118,119,120,121,122,0,123,0,124,125,126,127,128,129,130,131,0,132,133,0,134,135,136,137,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,138,0,139,0,0,0,0,140,141,142,143,0,0,0,0,0,144,0,0,0,145,0,0,146,147,148,149,0,0,0,0],DX:function(D,s){for(var F=0;
F<D.charset.length;F++)if(D.charset[F]==s)return F;return-1},I:function(D,s){if(s<0||s>255)return-1;
return i.T.s.DX(D,i.T.s.Dh[s])},DU:function(D,s,F){var c=i.B,K=[".notdef"],d=D[s];s++;if(d==0){for(var N=0;
N<F;N++){var l=c.K(D,s);s+=2;K.push(l)}}else if(d==1||d==2){while(K.length<F){var l=c.K(D,s),f=0;s+=2;
if(d==1){f=D[s];s++}else{f=c.K(D,s);s+=2}for(var N=0;N<=f;N++){K.push(l);l++}}}else throw"error: format: "+d;
return K},b:function(D,s,F){var c=i.B,K=c.K(D,s)+1;s+=2;var d=D[s];s++;if(d==1)for(var N=0;N<K;N++)F.push(D[s+N]);
else if(d==2)for(var N=0;N<K;N++)F.push(c.K(D,s+N*2));else if(d==3)for(var N=0;N<K;N++)F.push(c.Y(D,s+N*3-1)&16777215);
else if(d==4)for(var N=0;N<K;N++)F.push(c.Y(D,s+N*4));else if(K!=1)throw"unsupported offset size: "+d+", count: "+K;
s+=K*d;return s-1},sN:function(D,s,F){var c=i.B,K=D[s],d=D[s+1],N=D[s+2],l=D[s+3],f=D[s+4],_=1,P=null,k=null;
if(K<=20){P=K;_=1}if(K==12){P=K*100+d;_=2}if(21<=K&&K<=27){P=K;_=1}if(K==28){k=c.c(D,s+1);_=3}if(29<=K&&K<=31){P=K;
_=1}if(32<=K&&K<=246){k=K-139;_=1}if(247<=K&&K<=250){k=(K-247)*256+d+108;_=2}if(251<=K&&K<=254){k=-(K-251)*256-d-108;
_=2}if(K==255){k=c.n(D,s+1)/65535;_=5}F.Dc=k!=null?k:"o"+P;F.size=_},sr:function(D,s,F){var c=s+F,K=i.B,d=[];
while(s<c){var N=D[s],l=D[s+1],f=D[s+2],_=D[s+3],P=D[s+4],k=1,v=null,a=null;if(N<=20){v=N;k=1}if(N==12){v=N*100+l;
k=2}if(N==19||N==20){v=N;k=2}if(21<=N&&N<=27){v=N;k=1}if(N==28){a=K.c(D,s+1);k=3}if(29<=N&&N<=31){v=N;
k=1}if(32<=N&&N<=246){a=N-139;k=1}if(247<=N&&N<=250){a=(N-247)*256+l+108;k=2}if(251<=N&&N<=254){a=-(N-251)*256-l-108;
k=2}if(N==255){a=K.n(D,s+1)/65535;k=5}d.push(a!=null?a:"o"+v);s+=k}return d},h:function(D,s,F){var c=i.B,K={},d=[];
while(s<F){var N=D[s],l=D[s+1],f=D[s+2],_=D[s+3],P=D[s+4],k=1,v=null,a=null;if(N==28){a=c.c(D,s+1);k=3}if(N==29){a=c.n(D,s+1);
k=5}if(32<=N&&N<=246){a=N-139;k=1}if(247<=N&&N<=250){a=(N-247)*256+l+108;k=2}if(251<=N&&N<=254){a=-(N-251)*256-l-108;
k=2}if(N==255){a=c.n(D,s+1)/65535;k=5;throw"unknown number"}if(N==30){var r=[],S="";k=1;while(!0){var Q=D[s+k];
k++;var e=Q>>4,$=Q&15;if(e!=15)r.push(e);if($!=15)r.push($);if($==15)break}var t=[0,1,2,3,4,5,6,7,8,9,".","e","e-","reserved","-","endOfNumber"];
for(var Y=0;Y<r.length;Y++)S+=t[r[Y]];a=parseFloat(S)}if(N<=21){var w="version Notice FullName FamilyName Weight FontBBox BlueValues OtherBlues FamilyBlues FamilyOtherBlues StdHW StdVW escape UniqueID XUID charset Encoding CharStrings Private Subrs defaultWidthX nominalWidthX".split(" ");
v=w[N];k=1;if(N==12){var w="Copyright isFixedPitch ItalicAngle UnderlinePosition UnderlineThickness PaintType CharstringType FontMatrix StrokeWidth BlueScale BlueShift BlueFuzz StemSnapH StemSnapV ForceBold   LanguageGroup ExpansionFactor initialRandomSeed SyntheticBase PostScript BaseFontName BaseFontBlend       ROS CIDFontVersion CIDFontRevision CIDFontType CIDCount UIDBase FDArray FDSelect FontName".split(" ");
v=w[l];k=2}}if(v!=null){K[v]=d.length==1?d[0]:d;d=[]}else d.push(a);s+=k}return K}};i.T.d={$:function(D,s,F){var c={Z:[],N:{},De:s};
D=new Uint8Array(D.buffer,s,F);s=0;var K=s,d=i.B,N=d.K,l=i.T.d,f=N(D,s);s+=2;var _=N(D,s);s+=2;var P=[];
for(var k=0;k<_;k++){var v=N(D,s);s+=2;var a=N(D,s);s+=2;var r=d.Y(D,s);s+=4;var Q="p"+v+"e"+a,e=P.indexOf(r);
if(e==-1){e=c.Z.length;var $={};P.push(r);var S=$.DZ=N(D,r);if(S==0)$=l.sl(D,r,$);else if(S==4)$=l.Dr(D,r,$);
else if(S==6)$=l.DV(D,r,$);else if(S==12)$=l.DA(D,r,$);c.Z.push($)}if(c.N[Q]!=null)throw"multiple tables for one platform+encoding";
c.N[Q]=e}return c},sl:function(D,s,F){var c=i.B;s+=2;var K=c.K(D,s);s+=2;var d=c.K(D,s);s+=2;F.map=[];
for(var N=0;N<K-6;N++)F.map.push(D[s+N]);return F},Dr:function(D,s,F){var c=i.B,K=c.K,d=c.DN,N=s;s+=2;
var l=K(D,s);s+=2;var f=K(D,s);s+=2;var _=K(D,s);s+=2;var P=_>>>1;F.DS=K(D,s);s+=2;F.Dt=K(D,s);s+=2;
F.DY=K(D,s);s+=2;F.DD=d(D,s,P);s+=P*2;s+=2;F.DC=d(D,s,P);s+=P*2;F.Dm=[];for(var k=0;k<P;k++){F.Dm.push(c.c(D,s));
s+=2}F.C=d(D,s,P);s+=P*2;F.a=d(D,s,N+l-s>>>1);return F},DV:function(D,s,F){var c=i.B,K=s;s+=2;var d=c.K(D,s);
s+=2;var N=c.K(D,s);s+=2;F.Dl=c.K(D,s);s+=2;var l=c.K(D,s);s+=2;F.a=[];for(var f=0;f<l;f++){F.a.push(c.K(D,s));
s+=2}return F},DA:function(D,s,F){var c=i.B,K=c.Y,d=s;s+=4;var N=K(D,s);s+=4;var l=K(D,s);s+=4;var f=K(D,s)*3;
s+=4;var _=F.Df=new Uint32Array(f);for(var P=0;P<f;P+=3){_[P]=K(D,s+(P<<2));_[P+1]=K(D,s+(P<<2)+4);_[P+2]=K(D,s+(P<<2)+8)}return F}};
i.T.f={$:function(D,s,F,c){var K=[],d=c.maxp.numGlyphs;for(var N=0;N<d;N++)K.push(null);return K},DI:function(D,s){var F=i.B,c=D._data,K=D.loca;
if(K[s]==K[s+1])return null;var d=i.findTable(c,"glyf",D._offset)[0]+K[s],N={};N.g=F.c(c,d);d+=2;N.D_=F.c(c,d);
d+=2;N.DP=F.c(c,d);d+=2;N.Dw=F.c(c,d);d+=2;N.DM=F.c(c,d);d+=2;if(N.D_>=N.Dw||N.DP>=N.DM)return null;
if(N.g>0){N.r=[];for(var l=0;l<N.g;l++){N.r.push(F.K(c,d));d+=2}var f=F.K(c,d),Q=0,e=0;d+=2;if(c.length-d<f)return null;
N.Dy=F.p(c,d,f);d+=f;var _=N.r[N.g-1]+1;N.R=[];for(var l=0;l<_;l++){var P=c[d];d++;N.R.push(P);if((P&8)!=0){var k=c[d];
d++;for(var v=0;v<k;v++){N.R.push(P);l++}}}N.D=[];for(var l=0;l<_;l++){var a=(N.R[l]&2)!=0,r=(N.R[l]&16)!=0;
if(a){N.D.push(r?c[d]:-c[d]);d++}else{if(r)N.D.push(0);else{N.D.push(F.c(c,d));d+=2}}}N.i=[];for(var l=0;
l<_;l++){var a=(N.R[l]&4)!=0,r=(N.R[l]&32)!=0;if(a){N.i.push(r?c[d]:-c[d]);d++}else{if(r)N.i.push(0);
else{N.i.push(F.c(c,d));d+=2}}}for(var l=0;l<_;l++){Q+=N.D[l];e+=N.i[l];N.D[l]=Q;N.i[l]=e}}else{var $=1<<0,S=1<<1,t=1<<2,Y=1<<3,w=1<<4,p=1<<5,q=1<<6,C=1<<7,b=1<<8,U=1<<9,R=1<<10,G=1<<11,B=1<<12,T;
N.m=[];do{T=F.K(c,d);d+=2;var h={v:{q:1,Dz:0,Ds:0,V:1,si:0,DF:0},DR:-1,DB:-1};N.m.push(h);h.Dj=F.K(c,d);
d+=2;if(T&$){var z=F.c(c,d);d+=2;var Z=F.c(c,d);d+=2}else{var z=F.o(c,d);d++;var Z=F.o(c,d);d++}if(T&S){h.v.si=z;
h.v.DF=Z}else{h.DR=z;h.DB=Z}if(T&Y){h.v.q=h.v.V=F.j(c,d);d+=2}else if(T&q){h.v.q=F.j(c,d);d+=2;h.v.V=F.j(c,d);
d+=2}else if(T&C){h.v.q=F.j(c,d);d+=2;h.v.Dz=F.j(c,d);d+=2;h.v.Ds=F.j(c,d);d+=2;h.v.V=F.j(c,d);d+=2}}while(T&p);
if(T&b){var j=F.K(c,d);d+=2;N.DT=[];for(var l=0;l<j;l++){N.DT.push(c[d]);d++}}}return N}};i.T.head={$:function(D,s,F){var c=i.B,K={},d=c.F(D,s);
s+=4;K.fontRevision=c.F(D,s);s+=4;var N=c.Y(D,s);s+=4;var l=c.Y(D,s);s+=4;K.flags=c.K(D,s);s+=2;K.unitsPerEm=c.K(D,s);
s+=2;K.created=c.L(D,s);s+=8;K.modified=c.L(D,s);s+=8;K.xMin=c.c(D,s);s+=2;K.yMin=c.c(D,s);s+=2;K.xMax=c.c(D,s);
s+=2;K.yMax=c.c(D,s);s+=2;K.macStyle=c.K(D,s);s+=2;K.lowestRecPPEM=c.K(D,s);s+=2;K.fontDirectionHint=c.c(D,s);
s+=2;K.indexToLocFormat=c.c(D,s);s+=2;K.glyphDataFormat=c.c(D,s);s+=2;return K}};i.T.DK={$:function(D,s,F){var c=i.B,K={},d=c.F(D,s);
s+=4;var N="ascender descender lineGap advanceWidthMax minLeftSideBearing minRightSideBearing xMaxExtent caretSlopeRise caretSlopeRun caretOffset res0 res1 res2 res3 metricDataFormat numberOfHMetrics".split(" ");
for(var l=0;l<N.length;l++){var f=N[l],_=f=="advanceWidthMax"||f=="numberOfHMetrics"?c.K:c.c;K[f]=_(D,s+l*2)}return K}};
i.T.Da={$:function(D,s,F,c){var K=i.B,d=[],N=[],l=c.maxp.numGlyphs,f=c.hhea.numberOfHMetrics,_=0,P=0,k=0;
while(k<f){_=K.K(D,s+(k<<2));P=K.c(D,s+(k<<2)+2);d.push(_);N.push(P);k++}while(k<l){d.push(_);N.push(P);
k++}return{Dx:d,Du:N}}};i.T.z={$:function(D,s,F,c){var K=i.B,d=i.T.z,N=K.K(D,s);if(N==1)return d.D$(D,s,F,c);
var l=K.K(D,s+2);s+=4;var f={X:[],w:[]};for(var _=0;_<l;_++){s+=2;var F=K.K(D,s);s+=2;var P=K.K(D,s);
s+=2;var k=P>>>8;k&=15;if(k==0)s=d.k(D,s,f)}return f},D$:function(D,s,F,c){var K=i.B,d=i.T.z,N=K.F(D,s),l=K.Y(D,s+4);
s+=8;var f={X:[],w:[]};for(var _=0;_<l;_++){var F=K.Y(D,s);s+=4;var P=K.K(D,s);s+=2;var k=K.K(D,s);s+=2;
var v=P&255;if(v==0)s=d.k(D,s,f)}return f},k:function(D,s,F){var c=i.B,K=c.K,d=-1,N=K(D,s),l=K(D,s+2),f=K(D,s+4),_=K(D,s+6);
s+=8;for(var P=0;P<N;P++){var k=K(D,s);s+=2;var v=K(D,s);s+=2;var a=c.c(D,s);s+=2;if(k!=d){F.X.push(k);
F.w.push({Dd:[],DG:[]})}var r=F.w[F.w.length-1];r.Dd.push(v);r.DG.push(a);d=k}return s}};i.T.Dp={$:function(D,s,F,c){var K=i.B,d=[],N=c.head.indexToLocFormat,l=c.maxp.numGlyphs+1;
if(N==0)for(var f=0;f<l;f++)d.push(K.K(D,s+(f<<1))<<1);if(N==1)for(var f=0;f<l;f++)d.push(K.Y(D,s+(f<<2)));
return d}};i.T.Dq={$:function(D,s,F){var c=i.B,K=c.K,d={},N=c.Y(D,s);s+=4;d.numGlyphs=K(D,s);s+=2;return d}};
i.T.name={$:function(D,s,F){var c=i.B,K={},d=c.K(D,s),w="postScriptName",q;s+=2;var N=c.K(D,s);s+=2;
var l=c.K(D,s);s+=2;var f="copyright fontFamily fontSubfamily ID fullName version postScriptName trademark manufacturer designer description urlVendor urlDesigner licence licenceURL --- typoFamilyName typoSubfamilyName compatibleFull sampleText postScriptCID wwsFamilyName wwsSubfamilyName lightPalette darkPalette".split(" "),_=s,P=c.K;
for(var k=0;k<N;k++){var v=P(D,s),t;s+=2;var a=P(D,s);s+=2;var r=P(D,s);s+=2;var Q=P(D,s);s+=2;var e=P(D,s);
s+=2;var $=P(D,s);s+=2;var S=_+N*12+$;if(!1){}else if(v==0)t=c._(D,S,e/2);else if(v==3&&a==0)t=c._(D,S,e/2);
else if(a==0)t=c.Q(D,S,e);else if(a==1)t=c._(D,S,e/2);else if(a==3)t=c._(D,S,e/2);else if(a==4)t=c._(D,S,e/2);
else if(a==10)t=c._(D,S,e/2);else if(v==1){t=c.Q(D,S,e);console.log("reading unknown MAC encoding "+a+" as ASCII")}else{console.log("unknown encoding "+a+", platformID: "+v);
t=c.Q(D,S,e)}var Y="p"+v+","+r.toString(16);if(K[Y]==null)K[Y]={};K[Y][f[Q]]=t;K[Y]._lang=r}for(var p in K)if(K[p][w]!=null&&K[p]._lang==1033)return K[p];
for(var p in K)if(K[p][w]!=null&&K[p]._lang==0)return K[p];for(var p in K)if(K[p][w]!=null&&K[p]._lang==3084)return K[p];
for(var p in K)if(K[p][w]!=null)return K[p];for(var p in K){q=K[p];break}console.log("returning name table with languageID "+q.sF);
if(q[w]==null&&q.ID!=null)q[w]=q.ID;return q}};i.T.T={$:function(D,s,F){var c=i.B,K=c.K(D,s);s+=2;var d=i.T.T,N={};
if(K==0)d.e(D,s,N);else if(K==1)d.B(D,s,N);else if(K==2||K==3||K==4)d.sK(D,s,N);else if(K==5)d.Do(D,s,N);
else throw"unknown OS/2 table version: "+K;return N},e:function(D,s,F){var c=i.B;F.xAvgCharWidth=c.c(D,s);
s+=2;F.usWeightClass=c.K(D,s);s+=2;F.usWidthClass=c.K(D,s);s+=2;F.fsType=c.K(D,s);s+=2;F.ySubscriptXSize=c.c(D,s);
s+=2;F.ySubscriptYSize=c.c(D,s);s+=2;F.ySubscriptXOffset=c.c(D,s);s+=2;F.ySubscriptYOffset=c.c(D,s);
s+=2;F.ySuperscriptXSize=c.c(D,s);s+=2;F.ySuperscriptYSize=c.c(D,s);s+=2;F.ySuperscriptXOffset=c.c(D,s);
s+=2;F.ySuperscriptYOffset=c.c(D,s);s+=2;F.yStrikeoutSize=c.c(D,s);s+=2;F.yStrikeoutPosition=c.c(D,s);
s+=2;F.sFamilyClass=c.c(D,s);s+=2;F.panose=c.p(D,s,10);s+=10;F.ulUnicodeRange1=c.Y(D,s);s+=4;F.ulUnicodeRange2=c.Y(D,s);
s+=4;F.ulUnicodeRange3=c.Y(D,s);s+=4;F.ulUnicodeRange4=c.Y(D,s);s+=4;F.achVendID=c.Q(D,s,4);s+=4;F.fsSelection=c.K(D,s);
s+=2;F.usFirstCharIndex=c.K(D,s);s+=2;F.usLastCharIndex=c.K(D,s);s+=2;F.sTypoAscender=c.c(D,s);s+=2;
F.sTypoDescender=c.c(D,s);s+=2;F.sTypoLineGap=c.c(D,s);s+=2;F.usWinAscent=c.K(D,s);s+=2;F.usWinDescent=c.K(D,s);
s+=2;return s},B:function(D,s,F){var c=i.B;s=i.T.T.e(D,s,F);F.ulCodePageRange1=c.Y(D,s);s+=4;F.ulCodePageRange2=c.Y(D,s);
s+=4;return s},sK:function(D,s,F){var c=i.B,K=c.K;s=i.T.T.B(D,s,F);F.sxHeight=c.c(D,s);s+=2;F.sCapHeight=c.c(D,s);
s+=2;F.usDefault=K(D,s);s+=2;F.usBreak=K(D,s);s+=2;F.usMaxContext=K(D,s);s+=2;return s},Do:function(D,s,F){var c=i.B.K;
s=i.T.T.sK(D,s,F);F.usLowerOpticalPointSize=c(D,s);s+=2;F.usUpperOpticalPointSize=c(D,s);s+=2;return s}};
i.T.DE={$:function(D,s,F){var c=i.B,K={};K.version=c.F(D,s);s+=4;K.italicAngle=c.F(D,s);s+=4;K.underlinePosition=c.c(D,s);
s+=2;K.underlineThickness=c.c(D,s);s+=2;return K}};i.T.DL={$:function(D,s,F){var c=i.B,K={entries:[]},d=s,N=c.K(D,s);
s+=2;var l=c.Y(D,s);s+=4;var f=c.Y(D,s);s+=4;s=l+d;var _=c.K(D,s);s+=2;for(var P=0;P<_;P++){var k=c.K(D,s);
s+=2;var v=c.K(D,s);s+=2;var a=c.Y(D,s);s+=4;var r=c.Y(D,s);s+=4;var Q=new Uint8Array(D.buffer,d+a+l,r),e=c.Db(Q,0,Q.length);
for(var $=k;$<=v;$++){K.entries[$]=e}}return K}};i.U={shape:function(D,s,F){var c=function(D,K,a,F){var r=K[a],Q=K[a+1],e=D.kern;
if(e){var $=e.X.indexOf(r);if($!=-1){var S=e.w[$].Dd.indexOf(Q);if(S!=-1)return[0,0,e.w[$].DG[S],0]}}return[0,0,0,0]},K=[],f=0,_=0;
for(var d=0;d<s.length;d++){var N=s.codePointAt(d);if(N>65535)d++;K.push(i.U.codeToGlyph(D,N))}var l=[];
for(var d=0;d<K.length;d++){var P=c(D,K,d,F),k=K[d],v=D.hmtx.Dx[k]+P[2];l.push({g:k,cl:d,dx:0,dy:0,ax:v,ay:0});
f+=v}return l},shapeToPath:function(D,s){var F={P:[],l:[]},c=0,K=0;for(var d=0;d<s.length;d++){var N=s[d],l=i.U.glyphToPath(D,N.g),f=l.crds;
for(var _=0;_<f.length;_+=2){F.l.push(f[_]+c);F.l.push(f[_+1]+K)}for(var _=0;_<l.cmds.length;_++)F.P.push(l.cmds[_]);
c+=N.ax;K+=N.ay}return{cmds:F.P,crds:F.l}},codeToGlyph:function(D,s){var F=D.cmap,c=-1,K=["p0e4","p3e1","p1e0","p0e3","p0e1"];
for(var d=0;d<K.length;d++)if(F.N[K[d]]!=null){c=F.N[K[d]];break}if(c==-1)throw"no familiar platform and encoding!";
var N=function(r,S,t){var Y=0,w=Math.floor(r.length/S);while(Y+1!=w){var p=Y+(w-Y>>>1);if(r[p*S]<=t)Y=p;
else w=p}return Y*S},l=F.Z[c],f=l.DZ,_=-1;if(f==0){if(s>=l.map.length)_=0;else _=l.map[s]}else if(f==4){var P=-1,k=l.DD;
if(s>k[k.length-1])P=-1;else{P=N(k,1,s);if(k[P]<s)P++}if(P==-1)_=0;else if(s<l.DC[P])_=0;else{var v=0;
if(l.C[P]!=0)v=l.a[s-l.DC[P]+(l.C[P]>>1)-(l.C.length-P)];else v=s+l.Dm[P];_=v&65535}}else if(f==6){var a=s-l.Dl,r=l.a;
if(a<0||a>=r.length)_=0;else _=r[a]}else if(f==12){var Q=l.Df;if(s>Q[Q.length-2])_=0;else{var d=N(Q,3,s);
if(Q[d]<=s&&s<=Q[d+1]){_=Q[d+2]+(s-Q[d])}if(_==-1)_=0}}else throw"unknown cmap table format "+l.DZ;var e=D["SVG "],$=D.loca;
if(_!=0&&D["CFF "]==null&&(e==null||e.entries[_]==null)&&$[_]==$[_+1]&&[9,10,11,12,13,32,133,160,5760,8232,8233,8239,12288,6158,8203,8204,8205,8288,65279].indexOf(s)==-1&&!(8192<=s&&s<=8202))_=0;
return _},glyphToPath:function(D,s){var F={P:[],l:[]},c=D["SVG "],K=D["CFF "],d=i.U;if(c&&c.entries[s]){var N=c.entries[s];
if(N!=null){if(typeof N=="string"){N=d.SVG.DO(N);c.entries[s]=N}F=N}}else if(K){var l=K.Private,f={x:0,y:0,stack:[],M:0,G:!1,width:l?l.defaultWidthX:0,open:!1};
if(K.ROS){var _=0;while(K.FDSelect[_+2]<=s)_+=2;l=K.FDArray[K.FDSelect[_+1]].Private}d._drawCFF(K.CharStrings[s],f,K,l,F)}else if(D.glyf){d._drawGlyf(s,D,F)}return{cmds:F.P,crds:F.l}},_drawGlyf:function(D,s,F){var c=s.glyf[D];
if(c==null)c=s.glyf[D]=i.T.f.DI(s,D);if(c!=null){if(c.g>-1)i.U._simpleGlyph(c,F);else i.U._compoGlyph(c,s,F)}},_simpleGlyph:function(D,s){var F=i.U.P;
for(var c=0;c<D.g;c++){var K=c==0?0:D.r[c-1]+1,d=D.r[c];for(var N=K;N<=d;N++){var l=N==K?d:N-1,f=N==d?K:N+1,_=D.R[N]&1,k=D.R[l]&1,v=D.R[f]&1,a=D.D[N],r=D.i[N];
if(N==K){if(_){if(k)F.U(s,D.D[l],D.i[l]);else{F.U(s,a,r);continue}}else{if(k)F.U(s,D.D[l],D.i[l]);else F.U(s,Math.floor((D.D[l]+a)*.5),Math.floor((D.i[l]+r)*.5))}}if(_){if(k)F.A(s,a,r)}else{if(v)F.sc(s,a,r,D.D[f],D.i[f]);
else F.sc(s,a,r,Math.floor((a+D.D[f])*.5),Math.floor((r+D.i[f])*.5))}}F.J(s)}},_compoGlyph:function(D,s,F){for(var c=0;
c<D.m.length;c++){var K={P:[],l:[]},d=D.m[c];i.U._drawGlyf(d.Dj,s,K);var N=d.v;for(var l=0;l<K.l.length;
l+=2){var f=K.l[l],_=K.l[l+1];F.l.push(f*N.q+_*N.Dz+N.si);F.l.push(f*N.Ds+_*N.V+N.DF)}for(var l=0;l<K.P.length;
l++)F.P.push(K.P[l])}},pathToSVG:function(D,s){var F=D.cmds,c=D.crds,d=0;if(s==null)s=5;var K=[],N={M:2,L:2,Q:4,C:6};
for(var l=0;l<F.length;l++){var f=F[l],_=d+(N[f]?N[f]:0);K.push(f);while(d<_){var P=c[d++];K.push(parseFloat(P.toFixed(s))+(d==_?"":" "))}}return K.join("")},SVGToPath:function(D){var s={P:[],l:[]};
i.U.SVG.DW(D,s);return{cmds:s.P,crds:s.l}},pathToContext:function(D,s){var F=0,K=D.cmds,d=D.crds;for(var N=0;
N<K.length;N++){var l=K[N];if(l=="M"){s.moveTo(d[F],d[F+1]);F+=2}else if(l=="L"){s.lineTo(d[F],d[F+1]);
F+=2}else if(l=="C"){s.bezierCurveTo(d[F],d[F+1],d[F+2],d[F+3],d[F+4],d[F+5]);F+=6}else if(l=="Q"){s.quadraticCurveTo(d[F],d[F+1],d[F+2],d[F+3]);
F+=4}else if(l.charAt(0)=="#"){s.beginPath();s.fillStyle=l}else if(l=="Z"){s.closePath()}else if(l=="X"){s.fill()}}},P:{U:function(D,s,F){D.P.push("M");
D.l.push(s,F)},A:function(D,s,F){D.P.push("L");D.l.push(s,F)},S:function(D,s,F,c,K,N,l){D.P.push("C");
D.l.push(s,F,c,K,N,l)},sc:function(D,s,F,c,K){D.P.push("Q");D.l.push(s,F,c,K)},J:function(D){D.P.push("Z")}},_drawCFF:function(D,s,F,c,K){var d=s.stack,N=s.M,l=s.G,f=s.width,_=s.open,P=0,k=s.x,v=s.y,a=0,r=0,Q=0,e=0,$=0,S=0,t=0,Y=0,w=0,q=0,C=i.T.s,b=i.U.P,U=c.nominalWidthX,R={Dc:0,size:0};
while(P<D.length){C.sN(D,P,R);var G=R.Dc;P+=R.size;if(!1){}else if(G=="o1"||G=="o18"){var B;B=d.length%2!==0;
if(B&&!l){f=d.shift()+U}N+=d.length>>1;d.length=0;l=!0}else if(G=="o3"||G=="o23"){var B;B=d.length%2!==0;
if(B&&!l){f=d.shift()+U}N+=d.length>>1;d.length=0;l=!0}else if(G=="o4"){if(d.length>1&&!l){f=d.shift()+U;
l=!0}if(_)b.J(K);v+=d.pop();b.U(K,k,v);_=!0}else if(G=="o5"){while(d.length>0){k+=d.shift();v+=d.shift();
b.A(K,k,v)}}else if(G=="o6"||G=="o7"){var o=d.length,T=G=="o6";for(var h=0;h<o;h++){var z=d.shift();
if(T)k+=z;else v+=z;T=!T;b.A(K,k,v)}}else if(G=="o8"||G=="o24"){var o=d.length,Z=0;while(Z+6<=o){a=k+d.shift();
r=v+d.shift();Q=a+d.shift();e=r+d.shift();k=Q+d.shift();v=e+d.shift();b.S(K,a,r,Q,e,k,v);Z+=6}if(G=="o24"){k+=d.shift();
v+=d.shift();b.A(K,k,v)}}else if(G=="o11")break;else if(G=="o1234"||G=="o1235"||G=="o1236"||G=="o1237"){if(G=="o1234"){a=k+d.shift();
r=v;Q=a+d.shift();e=r+d.shift();w=Q+d.shift();q=e;$=w+d.shift();S=e;t=$+d.shift();Y=v;k=t+d.shift();
b.S(K,a,r,Q,e,w,q);b.S(K,$,S,t,Y,k,v)}if(G=="o1235"){a=k+d.shift();r=v+d.shift();Q=a+d.shift();e=r+d.shift();
w=Q+d.shift();q=e+d.shift();$=w+d.shift();S=q+d.shift();t=$+d.shift();Y=S+d.shift();k=t+d.shift();v=Y+d.shift();
d.shift();b.S(K,a,r,Q,e,w,q);b.S(K,$,S,t,Y,k,v)}if(G=="o1236"){a=k+d.shift();r=v+d.shift();Q=a+d.shift();
e=r+d.shift();w=Q+d.shift();q=e;$=w+d.shift();S=e;t=$+d.shift();Y=S+d.shift();k=t+d.shift();b.S(K,a,r,Q,e,w,q);
b.S(K,$,S,t,Y,k,v)}if(G=="o1237"){a=k+d.shift();r=v+d.shift();Q=a+d.shift();e=r+d.shift();w=Q+d.shift();
q=e+d.shift();$=w+d.shift();S=q+d.shift();t=$+d.shift();Y=S+d.shift();if(Math.abs(t-k)>Math.abs(Y-v)){k=t+d.shift()}else{v=Y+d.shift()}b.S(K,a,r,Q,e,w,q);
b.S(K,$,S,t,Y,k,v)}}else if(G=="o14"){if(d.length>0&&!l){f=d.shift()+F.nominalWidthX;l=!0}if(d.length==4){var j=0,W=d.shift(),M=d.shift(),m=d.shift(),De=d.shift(),Dq=C.I(F,m),Db=C.I(F,De);
i.U._drawCFF(F.CharStrings[Dq],s,F,c,K);s.x=W;s.y=M;i.U._drawCFF(F.CharStrings[Db],s,F,c,K)}if(_){b.J(K);
_=!1}}else if(G=="o19"||G=="o20"){var B;B=d.length%2!==0;if(B&&!l){f=d.shift()+U}N+=d.length>>1;d.length=0;
l=!0;P+=N+7>>3}else if(G=="o21"){if(d.length>2&&!l){f=d.shift()+U;l=!0}v+=d.pop();k+=d.pop();if(_)b.J(K);
b.U(K,k,v);_=!0}else if(G=="o22"){if(d.length>1&&!l){f=d.shift()+U;l=!0}k+=d.pop();if(_)b.J(K);b.U(K,k,v);
_=!0}else if(G=="o25"){while(d.length>6){k+=d.shift();v+=d.shift();b.A(K,k,v)}a=k+d.shift();r=v+d.shift();
Q=a+d.shift();e=r+d.shift();k=Q+d.shift();v=e+d.shift();b.S(K,a,r,Q,e,k,v)}else if(G=="o26"){if(d.length%2){k+=d.shift()}while(d.length>0){a=k;
r=v+d.shift();Q=a+d.shift();e=r+d.shift();k=Q;v=e+d.shift();b.S(K,a,r,Q,e,k,v)}}else if(G=="o27"){if(d.length%2){v+=d.shift()}while(d.length>0){a=k+d.shift();
r=v;Q=a+d.shift();e=r+d.shift();k=Q+d.shift();v=e;b.S(K,a,r,Q,e,k,v)}}else if(G=="o10"||G=="o29"){var I=G=="o10"?c:F;
if(d.length==0){console.log("error: empty stack")}else{var DQ=d.pop(),O=I.Subrs[DQ+I.Bias];s.x=k;s.y=v;
s.M=N;s.G=l;s.width=f;s.open=_;i.U._drawCFF(O,s,F,c,K);k=s.x;v=s.y;N=s.M;l=s.G;f=s.width;_=s.open}}else if(G=="o30"||G=="o31"){var o,J=d.length,Z=0,n=G=="o31";
o=J&~2;Z+=J-o;while(Z<o){if(n){a=k+d.shift();r=v;Q=a+d.shift();e=r+d.shift();v=e+d.shift();if(o-Z==5){k=Q+d.shift();
Z++}else k=Q;n=!1}else{a=k;r=v+d.shift();Q=a+d.shift();e=r+d.shift();k=Q+d.shift();if(o-Z==5){v=e+d.shift();
Z++}else v=e;n=!0}b.S(K,a,r,Q,e,k,v);Z+=4}}else if((G+"").charAt(0)=="o"){console.log("Unknown operation: "+G,D);
throw G}else d.push(G)}s.x=k;s.y=v;s.M=N;s.G=l;s.width=f;s.open=_},SVG:function(){var D={s_:function(P){return Math.sqrt(Math.abs(P[0]*P[3]-P[1]*P[2]))},translate:function(P,k,v){D.concat(P,[1,0,0,1,k,v])},rotate:function(P,k){D.concat(P,[Math.cos(k),-Math.sin(k),Math.sin(k),Math.cos(k),0,0])},scale:function(P,k,v){D.concat(P,[k,0,0,v,0,0])},concat:function(P,k){var v=P[0],r=P[1],Q=P[2],e=P[3],$=P[4],S=P[5];
P[0]=v*k[0]+r*k[2];P[1]=v*k[1]+r*k[3];P[2]=Q*k[0]+e*k[2];P[3]=Q*k[1]+e*k[3];P[4]=$*k[0]+S*k[2]+k[4];
P[5]=$*k[1]+S*k[3]+k[5]},sP:function(P){var k=P[0],v=P[1],r=P[2],Q=P[3],e=P[4],$=P[5],S=k*Q-v*r;P[0]=Q/S;
P[1]=-v/S;P[2]=-r/S;P[3]=k/S;P[4]=(r*$-Q*e)/S;P[5]=(v*e-k*$)/S},sk:function(P,k){var v=k[0],a=k[1];return[v*P[0]+a*P[2]+P[4],v*P[1]+a*P[3]+P[5]]},DH:function(P,k){for(var v=0;
v<k.length;v+=2){var r=k[v],Q=k[v+1];k[v]=r*P[0]+Q*P[2]+P[4];k[v+1]=r*P[1]+Q*P[3]+P[5]}}};function s(P,k,v){var a=[],r=0,Q=0,e=0;
while(!0){var $=P.indexOf(k,Q),S=P.indexOf(v,Q);if($==-1&&S==-1)break;if(S==-1||$!=-1&&$<S){if(e==0){a.push(P.slice(r,$).trim());
r=$+1}e++;Q=$+1}else if($==-1||S!=-1&&S<$){e--;if(e==0){a.push(P.slice(r,S).trim());r=S+1}Q=S+1}}return a}function F(P){var k=s(P,"{","}"),v={};
for(var a=0;a<k.length;a+=2){var r=k[a].split(",");for(var Q=0;Q<r.length;Q++){var e=r[Q].trim();if(v[e]==null)v[e]="";
v[e]+=k[a+1]}}return v}function c(P){var k=s(P,"(",")"),v=[1,0,0,1,0,0];for(var a=0;a<k.length;a+=2){var r=v;
v=K(k[a],k[a+1]);D.concat(v,r)}return v}function K(P,k){var v=[1,0,0,1,0,0],a=!0;for(var r=0;r<k.length;
r++){var Q=k.charAt(r);if(Q==","||Q==" ")a=!0;else if(Q=="."){if(!a){k=k.slice(0,r)+","+k.slice(r);r++}a=!1}else if(Q=="-"&&r>0&&k[r-1]!="e"){k=k.slice(0,r)+" "+k.slice(r);
r++;a=!0}}k=k.split(/\s*[\s,]\s*/).map(parseFloat);if(!1){}else if(P=="translate"){if(k.length==1)D.translate(v,k[0],0);
else D.translate(v,k[0],k[1])}else if(P=="scale"){if(k.length==1)D.scale(v,k[0],k[0]);else D.scale(v,k[0],k[1])}else if(P=="rotate"){var e=0,$=0;
if(k.length!=1){e=k[1];$=k[2]}D.translate(v,-e,-$);D.rotate(v,-Math.PI*k[0]/180);D.translate(v,e,$)}else if(P=="matrix")v=k;
else console.log("unknown transform: ",P);return v}function d(P){var k={P:[],l:[]};if(P==null)return k;
var v=new DOMParser,a=v.parseFromString(P,"image/svg+xml"),r=a.firstChild;while(r.tagName!="svg")r=r.nextSibling;
var Q=r.getAttribute("viewBox");if(Q)Q=Q.trim().split(" ").map(parseFloat);else Q=[0,0,1e3,1e3];N(r.children,k);
for(var e=0;e<k.l.length;e+=2){var $=k.l[e],S=k.l[e+1];$-=Q[0];S-=Q[1];S=-S;k.l[e]=$;k.l[e+1]=S}return k}function N(P,k,v){for(var a=0;
a<P.length;a++){var r=P[a],Q=r.tagName,e=r.getAttribute("fill");if(e==null)e=v;if(Q=="g"){var $={l:[],P:[]};
N(r.children,$,e);var S=r.getAttribute("transform");if(S){var t=c(S);D.DH(t,$.l)}k.l=k.l.concat($.l);
k.P=k.P.concat($.P)}else if(Q=="path"||Q=="circle"||Q=="ellipse"){k.P.push(e?e:"#000000");var Y;if(Q=="path")Y=r.getAttribute("d");
if(Q=="circle"||Q=="ellipse"){var w=[0,0,0,0],p=["cx","cy","rx","ry","r"];for(var q=0;q<5;q++){var C=r.getAttribute(p[q]);
if(C){C=parseFloat(C);if(q<4)w[q]=C;else w[2]=w[3]=C}}var b=w[0],R=w[1],G=w[2],B=w[3];Y=["M",b-G,R,"a",G,B,0,1,0,G*2,0,"a",G,B,0,1,0,-G*2,0].join(" ")}_(Y,k);
k.P.push("X")}else if(Q=="defs"){}else console.log(Q,r)}}function l(P){var k=[],v=0,a=!1,r="",Q="";while(v<P.length){var e=P.charCodeAt(v),$=P.charAt(v);
v++;var S=48<=e&&e<=57||$=="."||$=="-"||$=="e"||$=="E";if(a){if($=="-"&&Q!="e"||$=="."&&r.indexOf(".")!=-1){k.push(parseFloat(r));
r=$}else if(S)r+=$;else{k.push(parseFloat(r));if($!=","&&$!=" ")k.push($);a=!1}}else{if(S){r=$;a=!0}else if($!=","&&$!=" ")k.push($)}Q=$}if(a)k.push(parseFloat(r));
return k}function f(P,k,v){var a=k;while(a<P.length){if(typeof P[a]=="string")break;a+=v}return(a-k)/v}function _(P,k){var v=l(P),a=0,r=0,Q=0,e=0,$=0,S=k.l.length,t={M:2,L:2,H:1,V:1,T:2,S:4,A:7,Q:4,C:6},Y=k.P,w=k.l;
while(a<v.length){var p=v[a];a++;var q=p.toUpperCase();if(q=="Z"){Y.push("Z");r=e;Q=$}else{var C=t[q],b=f(v,a,C);
for(var R=0;R<b;R++){if(R==1&&q=="M"){p=p==q?"L":"l";q="L"}var G=0,B=0;if(p!=q){G=r;B=Q}if(!1){}else if(q=="M"){r=G+v[a++];
Q=B+v[a++];Y.push("M");w.push(r,Q);e=r;$=Q}else if(q=="L"){r=G+v[a++];Q=B+v[a++];Y.push("L");w.push(r,Q)}else if(q=="H"){r=G+v[a++];
Y.push("L");w.push(r,Q)}else if(q=="V"){Q=B+v[a++];Y.push("L");w.push(r,Q)}else if(q=="Q"){var T=G+v[a++],h=B+v[a++],z=G+v[a++],Z=B+v[a++];
Y.push("Q");w.push(T,h,z,Z);r=z;Q=Z}else if(q=="T"){var j=Math.max(w.length-2,S),T=r+r-w[j],h=Q+Q-w[j+1],z=G+v[a++],Z=B+v[a++];
Y.push("Q");w.push(T,h,z,Z);r=z;Q=Z}else if(q=="C"){var T=G+v[a++],h=B+v[a++],z=G+v[a++],Z=B+v[a++],W=G+v[a++],M=B+v[a++];
Y.push("C");w.push(T,h,z,Z,W,M);r=W;Q=M}else if(q=="S"){var j=Math.max(w.length-(Y[Y.length-1]=="C"?4:2),S),T=r+r-w[j],h=Q+Q-w[j+1],z=G+v[a++],Z=B+v[a++],W=G+v[a++],M=B+v[a++];
Y.push("C");w.push(T,h,z,Z,W,M);r=W;Q=M}else if(q=="A"){var T=r,h=Q,m=v[a++],E=v[a++],De=v[a++]*(Math.PI/180),Dq=v[a++],Db=v[a++],z=G+v[a++],Z=B+v[a++];
if(z==r&&Z==Q&&m==0&&E==0)continue;var I=(T-z)/2,DQ=(h-Z)/2,O=Math.cos(De),J=Math.sin(De),n=O*I+J*DQ,DM=-J*I+O*DQ,DV=m*m,DG=E*E,Di=n*n,DD=DM*DM,Ds=(DV*DG-DV*DD-DG*Di)/(DV*DD+DG*Di),DF=(Dq!=Db?1:-1)*Math.sqrt(Math.max(Ds,0)),D$=DF*(m*DM)/E,Dt=-DF*(E*n)/m,Dd=O*D$-J*Dt+(T+z)/2,DN=J*D$+O*Dt+(h+Z)/2,Dl=function(A,L,H,u){var Dc=Math.sqrt(A*A+L*L),DR=Math.sqrt(H*H+u*u),Dr=(A*H+L*u)/(Dc*DR);
return(A*u-L*H>=0?1:-1)*Math.acos(Math.max(-1,Math.min(1,Dr)))},Df=(n-D$)/m,D_=(DM-Dt)/E,DP=Dl(1,0,Df,D_),Dk=Dl(Df,D_,(-n-D$)/m,(-DM-Dt)/E);
Dk=Dk%(2*Math.PI);var Dv=function(DY,r,Q,A,L,H,u){var Dc=function(V,X){var Dp=Math.sin(X),j=Math.cos(X),X=V[0],DB=V[1],Dj=V[2],P=V[3];
V[0]=X*j+DB*Dp;V[1]=-X*Dp+DB*j;V[2]=Dj*j+P*Dp;V[3]=-Dj*Dp+P*j},DR=function(V,X){for(var R=0;R<X.length;
R+=2){var r=X[R],Q=X[R+1];X[R]=V[0]*r+V[2]*Q+V[4];X[R+1]=V[1]*r+V[3]*Q+V[5]}},Dr=function(V,X){for(var R=0;
R<X.length;R++)V.push(X[R])},Dw=function(V,A){Dr(V.P,A.P);Dr(V.l,A.l)};if(u)while(H>L)H-=2*Math.PI;else while(H<L)H+=2*Math.PI;
var DK=(H-L)/4,Da=Math.cos(DK/2),DS=-Math.sin(DK/2),T=(4-Da)/3,h=DS==0?DS:(1-Da)*(3-Da)/(3*DS),z=T,Z=-h,W=Da,M=-DS,C=[T,h,z,Z,W,M],k={P:["C","C","C","C"],l:C.slice(0)},g=[1,0,0,1,0,0];
Dc(g,-DK);for(var R=0;R<3;R++){DR(g,C);Dr(k.l,C)}Dc(g,-L+DK/2);g[0]*=A;g[1]*=A;g[2]*=A;g[3]*=A;g[4]=r;
g[5]=Q;DR(g,k.l);DR(DY.Dn,k.l);Dw(DY.Dg,k)},DY={Dg:k,Dn:[m*O,m*J,-E*J,E*O,Dd,DN]};Dv(DY,0,0,1,DP,DP+Dk,Db==0);
r=z;Q=Z}else console.log("Unknown SVG command "+p)}}}}return{cssMap:F,readTrnf:c,DW:_,DO:d}}()};return i}()

var UZIP = {};
if(typeof module == "object") module.exports = UZIP;


UZIP["parse"] = function(buf, onlyNames)	// ArrayBuffer
{
	var rUs = UZIP.bin.readUshort, rUi = UZIP.bin.readUint, o = 0, out = {};
	var data = new Uint8Array(buf);
	var eocd = data.length-4;
	
	while(rUi(data, eocd)!=0x06054b50) eocd--;
	
	var o = eocd;
	o+=4;	// sign  = 0x06054b50
	o+=4;  // disks = 0;
	var cnu = rUs(data, o);  o+=2;
	var cnt = rUs(data, o);  o+=2;
			
	var csize = rUi(data, o);  o+=4;
	var coffs = rUi(data, o);  o+=4;
	
	o = coffs;
	for(var i=0; i<cnu; i++)
	{
		var sign = rUi(data, o);  o+=4;
		o += 4;  // versions;
		o += 4;  // flag + compr
		o += 4;  // time
		
		var crc32 = rUi(data, o);  o+=4;
		var csize = rUi(data, o);  o+=4;
		var usize = rUi(data, o);  o+=4;
		
		var nl = rUs(data, o), el = rUs(data, o+2), cl = rUs(data, o+4);  o += 6;  // name, extra, comment
		o += 8;  // disk, attribs
		
		var roff = rUi(data, o);  o+=4;
		o += nl + el + cl;
		
		UZIP._readLocal(data, roff, out, csize, usize, onlyNames);
	}
	//console.log(out);
	return out;
}

UZIP._readLocal = function(data, o, out, csize, usize, onlyNames)
{
	var rUs = UZIP.bin.readUshort, rUi = UZIP.bin.readUint;
	var sign  = rUi(data, o);  o+=4;
	var ver   = rUs(data, o);  o+=2;
	var gpflg = rUs(data, o);  o+=2;
	//if((gpflg&8)!=0) throw "unknown sizes";
	var cmpr  = rUs(data, o);  o+=2;
	
	var time  = rUi(data, o);  o+=4;
	
	var crc32 = rUi(data, o);  o+=4;
	//var csize = rUi(data, o);  o+=4;
	//var usize = rUi(data, o);  o+=4;
	o+=8;
		
	var nlen  = rUs(data, o);  o+=2;
	var elen  = rUs(data, o);  o+=2;
		
	var name =  UZIP.bin.readUTF8(data, o, nlen);  o+=nlen;  //console.log(name);
	o += elen;
			
	//console.log(sign.toString(16), ver, gpflg, cmpr, crc32.toString(16), "csize, usize", csize, usize, nlen, elen, name, o);
	if(onlyNames) {  out[name]={size:usize, csize:csize};  return;  }   
	var file = new Uint8Array(data.buffer, o);
	if(false) {}
	else if(cmpr==0) out[name] = new Uint8Array(file.buffer.slice(o, o+csize));
	else if(cmpr==8) {
		var buf = new Uint8Array(usize);  UZIP.inflateRaw(file, buf);
		/*var nbuf = pako["inflateRaw"](file);
		if(usize>8514000) {
			//console.log(PUtils.readASCII(buf , 8514500, 500));
			//console.log(PUtils.readASCII(nbuf, 8514500, 500));
		}
		for(var i=0; i<buf.length; i++) if(buf[i]!=nbuf[i]) {  console.log(buf.length, nbuf.length, usize, i);  throw "e";  }
		*/
		out[name] = buf;
	}
	else throw "unknown compression method: "+cmpr;
}

UZIP.inflateRaw = function(file, buf) {  return UZIP.F.inflate(file, buf);  }
UZIP.inflate    = function(file, buf) { 
	var CMF = file[0], FLG = file[1];
	var CM = (CMF&15), CINFO = (CMF>>>4);
	//console.log(CM, CINFO,CMF,FLG);
	return UZIP.inflateRaw(new Uint8Array(file.buffer, file.byteOffset+2, file.length-6), buf);  
}
UZIP.deflate    = function(data, opts/*, buf, off*/) {
	if(opts==null) opts={level:6};
	var off=0, buf=new Uint8Array(50+Math.floor(data.length*1.1));
	buf[off]=120;  buf[off+1]=156;  off+=2;
	off = UZIP.F.deflateRaw(data, buf, off, opts.level);
	var crc = UZIP.adler(data, 0, data.length);
	buf[off+0]=((crc>>>24)&255); 
	buf[off+1]=((crc>>>16)&255); 
	buf[off+2]=((crc>>> 8)&255); 
	buf[off+3]=((crc>>> 0)&255); 	
	return new Uint8Array(buf.buffer, 0, off+4);
}
UZIP.deflateRaw = function(data, opts) {
	if(opts==null) opts={level:6};
	var buf=new Uint8Array(50+Math.floor(data.length*1.1));
	var off = UZIP.F.deflateRaw(data, buf, off, opts.level);
	return new Uint8Array(buf.buffer, 0, off);
}


UZIP.encode = function(obj, noCmpr) {
	if(noCmpr==null) noCmpr=false;
	var tot = 0, wUi = UZIP.bin.writeUint, wUs = UZIP.bin.writeUshort;
	var zpd = {};
	for(var p in obj) {  var cpr = !UZIP._noNeed(p) && !noCmpr, buf = obj[p], crc = UZIP.crc.crc(buf,0,buf.length); 
		zpd[p] = {  cpr:cpr, usize:buf.length, crc:crc, file: (cpr ? UZIP.deflateRaw(buf) : buf)  };  }
	
	for(var p in zpd) tot += zpd[p].file.length + 30 + 46 + 2*UZIP.bin.sizeUTF8(p);
	tot +=  22;
	
	var data = new Uint8Array(tot), o = 0;
	var fof = []
	
	for(var p in zpd) {
		var file = zpd[p];  fof.push(o);
		o = UZIP._writeHeader(data, o, p, file, 0);
	}
	var i=0, ioff = o;
	for(var p in zpd) {
		var file = zpd[p];  fof.push(o);
		o = UZIP._writeHeader(data, o, p, file, 1, fof[i++]);		
	}
	var csize = o-ioff;
	
	wUi(data, o, 0x06054b50);  o+=4;
	o += 4;  // disks
	wUs(data, o, i);  o += 2;
	wUs(data, o, i);  o += 2;	// number of c d records
	wUi(data, o, csize);  o += 4;
	wUi(data, o, ioff );  o += 4;
	o += 2;
	return data.buffer;
}
// no need to compress .PNG, .ZIP, .JPEG ....
UZIP._noNeed = function(fn) {  var ext = fn.split(".").pop().toLowerCase();  return "png,jpg,jpeg,zip".indexOf(ext)!=-1;  }

UZIP._writeHeader = function(data, o, p, obj, t, roff)
{
	var wUi = UZIP.bin.writeUint, wUs = UZIP.bin.writeUshort;
	var file = obj.file;
	
	wUi(data, o, t==0 ? 0x04034b50 : 0x02014b50);  o+=4; // sign
	if(t==1) o+=2;  // ver made by
	wUs(data, o, 20);  o+=2;	// ver
	wUs(data, o,  0);  o+=2;    // gflip
	wUs(data, o,  obj.cpr?8:0);  o+=2;	// cmpr
		
	wUi(data, o,  0);  o+=4;	// time		
	wUi(data, o, obj.crc);  o+=4;	// crc32
	wUi(data, o, file.length);  o+=4;	// csize
	wUi(data, o, obj.usize);  o+=4;	// usize
		
	wUs(data, o, UZIP.bin.sizeUTF8(p));  o+=2;	// nlen
	wUs(data, o, 0);  o+=2;	// elen
	
	if(t==1) {
		o += 2;  // comment length
		o += 2;  // disk number
		o += 6;  // attributes
		wUi(data, o, roff);  o+=4;	// usize
	}
	var nlen = UZIP.bin.writeUTF8(data, o, p);  o+= nlen;	
	if(t==0) {  data.set(file, o);  o += file.length;  }
	return o;
}





UZIP.crc = {
	table : ( function() {
	   var tab = new Uint32Array(256);
	   for (var n=0; n<256; n++) {
			var c = n;
			for (var k=0; k<8; k++) {
				if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
				else        c = c >>> 1;
			}
			tab[n] = c;  }    
		return tab;  })(),
	update : function(c, buf, off, len) {
		for (var i=0; i<len; i++)  c = UZIP.crc.table[(c ^ buf[off+i]) & 0xff] ^ (c >>> 8);
		return c;
	},
	crc : function(b,o,l)  {  return UZIP.crc.update(0xffffffff,b,o,l) ^ 0xffffffff;  }
}
UZIP.adler = function(data,o,len) {
	var a = 1, b = 0;
	var off = o, end=o+len;
	while(off<end) {
		var eend = Math.min(off+5552, end);
		while(off<eend) {
			a += data[off++];
			b += a;
		}
		a=a%65521;
		b=b%65521;
	}
    return (b << 16) | a;
}

UZIP.bin = {
	readUshort : function(buff,p)  {  return (buff[p]) | (buff[p+1]<<8);  },
	writeUshort: function(buff,p,n){  buff[p] = (n)&255;  buff[p+1] = (n>>8)&255;  },
	readUint   : function(buff,p)  {  return (buff[p+3]*(256*256*256)) + ((buff[p+2]<<16) | (buff[p+1]<< 8) | buff[p]);  },
	writeUint  : function(buff,p,n){  buff[p]=n&255;  buff[p+1]=(n>>8)&255;  buff[p+2]=(n>>16)&255;  buff[p+3]=(n>>24)&255;  },
	readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    },
	writeASCII : function(data,p,s){  for(var i=0; i<s.length; i++) data[p+i] = s.charCodeAt(i);  },
	pad : function(n) { return n.length < 2 ? "0" + n : n; },
	readUTF8 : function(buff, p, l) {
		var s = "", ns;
		for(var i=0; i<l; i++) s += "%" + UZIP.bin.pad(buff[p+i].toString(16));
		try {  ns = decodeURIComponent(s); }
		catch(e) {  return UZIP.bin.readASCII(buff, p, l);  }
		return  ns;
	},
	writeUTF8 : function(buff, p, str) {
		var strl = str.length, i=0;
		for(var ci=0; ci<strl; ci++)
		{
			var code = str.charCodeAt(ci);
			if     ((code&(0xffffffff-(1<< 7)+1))==0) {  buff[p+i] = (     code     );  i++;  }
			else if((code&(0xffffffff-(1<<11)+1))==0) {  buff[p+i] = (192|(code>> 6));  buff[p+i+1] = (128|((code>> 0)&63));  i+=2;  }
			else if((code&(0xffffffff-(1<<16)+1))==0) {  buff[p+i] = (224|(code>>12));  buff[p+i+1] = (128|((code>> 6)&63));  buff[p+i+2] = (128|((code>>0)&63));  i+=3;  }
			else if((code&(0xffffffff-(1<<21)+1))==0) {  buff[p+i] = (240|(code>>18));  buff[p+i+1] = (128|((code>>12)&63));  buff[p+i+2] = (128|((code>>6)&63));  buff[p+i+3] = (128|((code>>0)&63)); i+=4;  }
			else throw "e";
		}
		return i;
	},
	sizeUTF8 : function(str) {
		var strl = str.length, i=0;
		for(var ci=0; ci<strl; ci++)
		{
			var code = str.charCodeAt(ci);
			if     ((code&(0xffffffff-(1<< 7)+1))==0) {  i++ ;  }
			else if((code&(0xffffffff-(1<<11)+1))==0) {  i+=2;  }
			else if((code&(0xffffffff-(1<<16)+1))==0) {  i+=3;  }
			else if((code&(0xffffffff-(1<<21)+1))==0) {  i+=4;  }
			else throw "e";
		}
		return i;
	}
}





















UZIP.F = {};

UZIP.F.deflateRaw = function(data, out, opos, lvl) {	
	var opts = [
	/*
		 ush good_length; /* reduce lazy search above this match length 
		 ush max_lazy;    /* do not perform lazy search above this match length 
         ush nice_length; /* quit search above this match length 
	*/
	/*      good lazy nice chain */
	/* 0 */ [ 0,   0,   0,    0,0],  /* store only */
	/* 1 */ [ 4,   4,   8,    4,0], /* max speed, no lazy matches */
	/* 2 */ [ 4,   5,  16,    8,0],
	/* 3 */ [ 4,   6,  16,   16,0],

	/* 4 */ [ 4,  10,  16,   32,0],  /* lazy matches */
	/* 5 */ [ 8,  16,  32,   32,0],
	/* 6 */ [ 8,  16, 128,  128,0],
	/* 7 */ [ 8,  32, 128,  256,0],
	/* 8 */ [32, 128, 258, 1024,1],
	/* 9 */ [32, 258, 258, 4096,1]]; /* max compression */
	
	var opt = opts[lvl];
	
	
	var U = UZIP.F.U, goodIndex = UZIP.F._goodIndex, hash = UZIP.F._hash, putsE = UZIP.F._putsE;
	var i = 0, pos = opos<<3, cvrd = 0, dlen = data.length;
	
	if(lvl==0) {
		while(i<dlen) {   var len = Math.min(0xffff, dlen-i);
			putsE(out, pos, (i+len==dlen ? 1 : 0));  pos = UZIP.F._copyExact(data, i, len, out, pos+8);  i += len;  }
		return pos>>>3;
	}

	var lits = U.lits, strt=U.strt, prev=U.prev, li=0, lc=0, bs=0, ebits=0, c=0, nc=0;  // last_item, literal_count, block_start
	if(dlen>2) {  nc=UZIP.F._hash(data,0);  strt[nc]=0;  }
	var nmch=0,nmci=0;
	
	for(i=0; i<dlen; i++)  {
		c = nc;
		//*
		if(i+1<dlen-2) {
			nc = UZIP.F._hash(data, i+1);
			var ii = ((i+1)&0x7fff);
			prev[ii]=strt[nc];
			strt[nc]=ii;
		} //*/
		if(cvrd<=i) {
			if((li>14000 || lc>26697) && (dlen-i)>100) {
				if(cvrd<i) {  lits[li]=i-cvrd;  li+=2;  cvrd=i;  }
				pos = UZIP.F._writeBlock(((i==dlen-1) || (cvrd==dlen))?1:0, lits, li, ebits, data,bs,i-bs, out, pos);  li=lc=ebits=0;  bs=i;
			}
			
			var mch = 0;
			//if(nmci==i) mch= nmch;  else 
			if(i<dlen-2) mch = UZIP.F._bestMatch(data, i, prev, c, Math.min(opt[2],dlen-i), opt[3]);
			/*
			if(mch!=0 && opt[4]==1 && (mch>>>16)<opt[1] && i+1<dlen-2) {
				nmch = UZIP.F._bestMatch(data, i+1, prev, nc, opt[2], opt[3]);  nmci=i+1;
				//var mch2 = UZIP.F._bestMatch(data, i+2, prev, nnc);  //nmci=i+1;
				if((nmch>>>16)>(mch>>>16)) mch=0;
			}//*/
			var len = mch>>>16, dst = mch&0xffff;  //if(i-dst<0) throw "e";
			if(mch!=0) { 
				var len = mch>>>16, dst = mch&0xffff;  //if(i-dst<0) throw "e";
				var lgi = goodIndex(len, U.of0);  U.lhst[257+lgi]++; 
				var dgi = goodIndex(dst, U.df0);  U.dhst[    dgi]++;  ebits += U.exb[lgi] + U.dxb[dgi]; 
				lits[li] = (len<<23)|(i-cvrd);  lits[li+1] = (dst<<16)|(lgi<<8)|dgi;  li+=2;
				cvrd = i + len;  
			}
			else {	U.lhst[data[i]]++;  }
			lc++;
		}
	}
	if(bs!=i || data.length==0) {
		if(cvrd<i) {  lits[li]=i-cvrd;  li+=2;  cvrd=i;  }
		pos = UZIP.F._writeBlock(1, lits, li, ebits, data,bs,i-bs, out, pos);  li=0;  lc=0;  li=lc=ebits=0;  bs=i;
	}
	while((pos&7)!=0) pos++;
	return pos>>>3;
}
UZIP.F._bestMatch = function(data, i, prev, c, nice, chain) {
	var ci = (i&0x7fff), pi=prev[ci];  
	//console.log("----", i);
	var dif = ((ci-pi + (1<<15)) & 0x7fff);  if(pi==ci || c!=UZIP.F._hash(data,i-dif)) return 0;
	var tl=0, td=0;  // top length, top distance
	var dlim = Math.min(0x7fff, i);
	while(dif<=dlim && --chain!=0 && pi!=ci /*&& c==UZIP.F._hash(data,i-dif)*/) {
		if(tl==0 || (data[i+tl]==data[i+tl-dif])) {
			var cl = UZIP.F._howLong(data, i, dif);
			if(cl>tl) {  
				tl=cl;  td=dif;  if(tl>=nice) break;    //* 
				if(dif+2<cl) cl = dif+2;
				var maxd = 0; // pi does not point to the start of the word
				for(var j=0; j<cl-2; j++) {
					var ei =  (i-dif+j+ (1<<15)) & 0x7fff;
					var li = prev[ei];
					var curd = (ei-li + (1<<15)) & 0x7fff;
					if(curd>maxd) {  maxd=curd;  pi = ei; }
				}  //*/
			}
		}
		
		ci=pi;  pi = prev[ci];
		dif += ((ci-pi + (1<<15)) & 0x7fff);
	}
	return (tl<<16)|td;
}
UZIP.F._howLong = function(data, i, dif) {
	if(data[i]!=data[i-dif] || data[i+1]!=data[i+1-dif] || data[i+2]!=data[i+2-dif]) return 0;
	var oi=i, l = Math.min(data.length, i+258);  i+=3;
	//while(i+4<l && data[i]==data[i-dif] && data[i+1]==data[i+1-dif] && data[i+2]==data[i+2-dif] && data[i+3]==data[i+3-dif]) i+=4;
	while(i<l && data[i]==data[i-dif]) i++;
	return i-oi;
}
UZIP.F._hash = function(data, i) {
	return (((data[i]<<8) | data[i+1])+(data[i+2]<<4))&0xffff;
	//var hash_shift = 0, hash_mask = 255;
	//var h = data[i+1] % 251;
	//h = (((h << 8) + data[i+2]) % 251);
	//h = (((h << 8) + data[i+2]) % 251);
	//h = ((h<<hash_shift) ^ (c) ) & hash_mask;
	//return h | (data[i]<<8);
	//return (data[i] | (data[i+1]<<8));
}
//UZIP.___toth = 0;
UZIP.saved = 0;
UZIP.F._writeBlock = function(BFINAL, lits, li, ebits, data,o0,l0, out, pos) {
	var U = UZIP.F.U, putsF = UZIP.F._putsF, putsE = UZIP.F._putsE;
	
	//*
	var T, ML, MD, MH, numl, numd, numh, lset, dset;  U.lhst[256]++;
	T = UZIP.F.getTrees(); ML=T[0]; MD=T[1]; MH=T[2]; numl=T[3]; numd=T[4]; numh=T[5]; lset=T[6]; dset=T[7];
	
	var cstSize = (((pos+3)&7)==0 ? 0 : 8-((pos+3)&7)) + 32 + (l0<<3);
	var fxdSize = ebits + UZIP.F.contSize(U.fltree, U.lhst) + UZIP.F.contSize(U.fdtree, U.dhst);
	var dynSize = ebits + UZIP.F.contSize(U.ltree , U.lhst) + UZIP.F.contSize(U.dtree , U.dhst);
	dynSize    += 14 + 3*numh + UZIP.F.contSize(U.itree, U.ihst) + (U.ihst[16]*2 + U.ihst[17]*3 + U.ihst[18]*7);
	
	for(var j=0; j<286; j++) U.lhst[j]=0;   for(var j=0; j<30; j++) U.dhst[j]=0;   for(var j=0; j<19; j++) U.ihst[j]=0;
	//*/
	var BTYPE = (cstSize<fxdSize && cstSize<dynSize) ? 0 : ( fxdSize<dynSize ? 1 : 2 );
	putsF(out, pos, BFINAL);  putsF(out, pos+1, BTYPE);  pos+=3;
	
	var opos = pos;
	if(BTYPE==0) {
		while((pos&7)!=0) pos++;
		pos = UZIP.F._copyExact(data, o0, l0, out, pos);
	}
	else {
		var ltree, dtree;
		if(BTYPE==1) {  ltree=U.fltree;  dtree=U.fdtree;  }
		if(BTYPE==2) {	
			UZIP.F.makeCodes(U.ltree, ML);  UZIP.F.revCodes(U.ltree, ML);
			UZIP.F.makeCodes(U.dtree, MD);  UZIP.F.revCodes(U.dtree, MD);
			UZIP.F.makeCodes(U.itree, MH);  UZIP.F.revCodes(U.itree, MH);
			
			ltree = U.ltree;  dtree = U.dtree;
			
			putsE(out, pos,numl-257);  pos+=5;  // 286
			putsE(out, pos,numd-  1);  pos+=5;  // 30
			putsE(out, pos,numh-  4);  pos+=4;  // 19
			
			for(var i=0; i<numh; i++) putsE(out, pos+i*3, U.itree[(U.ordr[i]<<1)+1]);   pos+=3* numh;
			pos = UZIP.F._codeTiny(lset, U.itree, out, pos);
			pos = UZIP.F._codeTiny(dset, U.itree, out, pos);
		}
		
		var off=o0;
		for(var si=0; si<li; si+=2) {
			var qb=lits[si], len=(qb>>>23), end = off+(qb&((1<<23)-1));
			while(off<end) pos = UZIP.F._writeLit(data[off++], ltree, out, pos);
			
			if(len!=0) {
				var qc = lits[si+1], dst=(qc>>16), lgi=(qc>>8)&255, dgi=(qc&255);
				pos = UZIP.F._writeLit(257+lgi, ltree, out, pos);
				putsE(out, pos, len-U.of0[lgi]);  pos+=U.exb[lgi];
				
				pos = UZIP.F._writeLit(dgi, dtree, out, pos);
				putsF(out, pos, dst-U.df0[dgi]);  pos+=U.dxb[dgi];  off+=len;
			}
		}
		pos = UZIP.F._writeLit(256, ltree, out, pos);
	}
	//console.log(pos-opos, fxdSize, dynSize, cstSize);
	return pos;
}
UZIP.F._copyExact = function(data,off,len,out,pos) {
	var p8 = (pos>>>3);
	out[p8]=(len);  out[p8+1]=(len>>>8);  out[p8+2]=255-out[p8];  out[p8+3]=255-out[p8+1];  p8+=4;
	out.set(new Uint8Array(data.buffer, off, len), p8);
	//for(var i=0; i<len; i++) out[p8+i]=data[off+i];
	return pos + ((len+4)<<3);
}
/*
	Interesting facts:
	- decompressed block can have bytes, which do not occur in a Huffman tree (copied from the previous block by reference)
*/

UZIP.F.getTrees = function() {
	var U = UZIP.F.U;
	var ML = UZIP.F._hufTree(U.lhst, U.ltree, 15);
	var MD = UZIP.F._hufTree(U.dhst, U.dtree, 15);
	var lset = [], numl = UZIP.F._lenCodes(U.ltree, lset);
	var dset = [], numd = UZIP.F._lenCodes(U.dtree, dset);
	for(var i=0; i<lset.length; i+=2) U.ihst[lset[i]]++;
	for(var i=0; i<dset.length; i+=2) U.ihst[dset[i]]++;
	var MH = UZIP.F._hufTree(U.ihst, U.itree,  7);
	var numh = 19;  while(numh>4 && U.itree[(U.ordr[numh-1]<<1)+1]==0) numh--;
	return [ML, MD, MH, numl, numd, numh, lset, dset];
}
UZIP.F.getSecond= function(a) {  var b=[];  for(var i=0; i<a.length; i+=2) b.push  (a[i+1]);  return b;  }
UZIP.F.nonZero  = function(a) {  var b= "";  for(var i=0; i<a.length; i+=2) if(a[i+1]!=0)b+=(i>>1)+",";  return b;  }
UZIP.F.contSize = function(tree, hst) {  var s=0;  for(var i=0; i<hst.length; i++) s+= hst[i]*tree[(i<<1)+1];  return s;  }
UZIP.F._codeTiny = function(set, tree, out, pos) {
	for(var i=0; i<set.length; i+=2) {
		var l = set[i], rst = set[i+1];  //console.log(l, pos, tree[(l<<1)+1]);
		pos = UZIP.F._writeLit(l, tree, out, pos);
		var rsl = l==16 ? 2 : (l==17 ? 3 : 7);
		if(l>15) {  UZIP.F._putsE(out, pos, rst, rsl);  pos+=rsl;  }
	}
	return pos;
}
UZIP.F._lenCodes = function(tree, set) {
	var len=tree.length;  while(len!=2 && tree[len-1]==0) len-=2;  // when no distances, keep one code with length 0
	for(var i=0; i<len; i+=2) {
		var l = tree[i+1], nxt = (i+3<len ? tree[i+3]:-1),  nnxt = (i+5<len ? tree[i+5]:-1),  prv = (i==0 ? -1 : tree[i-1]);
		if(l==0 && nxt==l && nnxt==l) {
			var lz = i+5;
			while(lz+2<len && tree[lz+2]==l) lz+=2;
			var zc = Math.min((lz+1-i)>>>1, 138);
			if(zc<11) set.push(17, zc-3);
			else set.push(18, zc-11);
			i += zc*2-2;
		}
		else if(l==prv && nxt==l && nnxt==l) {
			var lz = i+5;
			while(lz+2<len && tree[lz+2]==l) lz+=2;
			var zc = Math.min((lz+1-i)>>>1, 6);
			set.push(16, zc-3);
			i += zc*2-2;
		}
		else set.push(l, 0);
	}
	return len>>>1;
}
UZIP.F._hufTree   = function(hst, tree, MAXL) {
	var list=[], hl = hst.length, tl=tree.length, i=0;
	for(i=0; i<tl; i+=2) {  tree[i]=0;  tree[i+1]=0;  }	
	for(i=0; i<hl; i++) if(hst[i]!=0) list.push({lit:i, f:hst[i]});
	var end = list.length, l2=list.slice(0);
	if(end==0) return 0;  // empty histogram (usually for dist)
	if(end==1) {  var lit=list[0].lit, l2=lit==0?1:0;  tree[(lit<<1)+1]=1;  tree[(l2<<1)+1]=1;  return 1;  }
	list.sort(function(a,b){return a.f-b.f;});
	var a=list[0], b=list[1], i0=0, i1=1, i2=2;  list[0]={lit:-1,f:a.f+b.f,l:a,r:b,d:0};
	while(i1!=end-1) {
		if(i0!=i1 && (i2==end || list[i0].f<list[i2].f)) {  a=list[i0++];  }  else {  a=list[i2++];  }
		if(i0!=i1 && (i2==end || list[i0].f<list[i2].f)) {  b=list[i0++];  }  else {  b=list[i2++];  }
		list[i1++]={lit:-1,f:a.f+b.f, l:a,r:b};
	}
	var maxl = UZIP.F.setDepth(list[i1-1], 0);
	if(maxl>MAXL) {  UZIP.F.restrictDepth(l2, MAXL, maxl);  maxl = MAXL;  }
	for(i=0; i<end; i++) tree[(l2[i].lit<<1)+1]=l2[i].d;
	return maxl;
}

UZIP.F.setDepth  = function(t, d) {
	if(t.lit!=-1) {  t.d=d;  return d;  }
	return Math.max( UZIP.F.setDepth(t.l, d+1),  UZIP.F.setDepth(t.r, d+1) );
}

UZIP.F.restrictDepth = function(dps, MD, maxl) {
	var i=0, bCost=1<<(maxl-MD), dbt=0;
	dps.sort(function(a,b){return b.d==a.d ? a.f-b.f : b.d-a.d;});
	
	for(i=0; i<dps.length; i++) if(dps[i].d>MD) {  var od=dps[i].d;  dps[i].d=MD;  dbt+=bCost-(1<<(maxl-od));  }  else break;
	dbt = dbt>>>(maxl-MD);
	while(dbt>0) {  var od=dps[i].d;  if(od<MD) {  dps[i].d++;  dbt-=(1<<(MD-od-1));  }  else  i++;  }
	for(; i>=0; i--) if(dps[i].d==MD && dbt<0) {  dps[i].d--;  dbt++;  }  if(dbt!=0) console.log("debt left");
}

UZIP.F._goodIndex = function(v, arr) {
	var i=0;  if(arr[i|16]<=v) i|=16;  if(arr[i|8]<=v) i|=8;  if(arr[i|4]<=v) i|=4;  if(arr[i|2]<=v) i|=2;  if(arr[i|1]<=v) i|=1;  return i;
}
UZIP.F._writeLit = function(ch, ltree, out, pos) {
	UZIP.F._putsF(out, pos, ltree[ch<<1]);
	return pos+ltree[(ch<<1)+1];
}








UZIP.F.inflate = function(data, buf) {
	var u8=Uint8Array;
	if(data[0]==3 && data[1]==0) return (buf ? buf : new u8(0));
	var F=UZIP.F, bitsF = F._bitsF, bitsE = F._bitsE, decodeTiny = F._decodeTiny, makeCodes = F.makeCodes, codes2map=F.codes2map, get17 = F._get17;
	var U = F.U;
	
	var noBuf = (buf==null);
	if(noBuf) buf = new u8((data.length>>>2)<<3);
	
	var BFINAL=0, BTYPE=0, HLIT=0, HDIST=0, HCLEN=0, ML=0, MD=0; 	
	var off = 0, pos = 0;
	var lmap, dmap;
	
	while(BFINAL==0) {		
		BFINAL = bitsF(data, pos  , 1);
		BTYPE  = bitsF(data, pos+1, 2);  pos+=3;
		//console.log(BFINAL, BTYPE);
		
		if(BTYPE==0) {
			if((pos&7)!=0) pos+=8-(pos&7);
			var p8 = (pos>>>3)+4, len = data[p8-4]|(data[p8-3]<<8);  //console.log(len);//bitsF(data, pos, 16), 
			if(noBuf) buf=UZIP.F._check(buf, off+len);
			buf.set(new u8(data.buffer, data.byteOffset+p8, len), off);
			//for(var i=0; i<len; i++) buf[off+i] = data[p8+i];
			//for(var i=0; i<len; i++) if(buf[off+i] != data[p8+i]) throw "e";
			pos = ((p8+len)<<3);  off+=len;  continue;
		}
		if(noBuf) buf=UZIP.F._check(buf, off+(1<<17));  // really not enough in many cases (but PNG and ZIP provide buffer in advance)
		if(BTYPE==1) {  lmap = U.flmap;  dmap = U.fdmap;  ML = (1<<9)-1;  MD = (1<<5)-1;   }
		if(BTYPE==2) {
			HLIT  = bitsE(data, pos   , 5)+257;  
			HDIST = bitsE(data, pos+ 5, 5)+  1;  
			HCLEN = bitsE(data, pos+10, 4)+  4;  pos+=14;
			
			var ppos = pos;
			for(var i=0; i<38; i+=2) {  U.itree[i]=0;  U.itree[i+1]=0;  }
			var tl = 1;
			for(var i=0; i<HCLEN; i++) {  var l=bitsE(data, pos+i*3, 3);  U.itree[(U.ordr[i]<<1)+1] = l;  if(l>tl)tl=l;  }     pos+=3*HCLEN;  //console.log(itree);
			makeCodes(U.itree, tl);
			codes2map(U.itree, tl, U.imap);
			
			lmap = U.lmap;  dmap = U.dmap;
			
			pos = decodeTiny(U.imap, (1<<tl)-1, HLIT+HDIST, data, pos, U.ttree);
			var mx0 = F._copyOut(U.ttree,    0, HLIT , U.ltree);  ML = (1<<mx0)-1;
			var mx1 = F._copyOut(U.ttree, HLIT, HDIST, U.dtree);  MD = (1<<mx1)-1;
			
			//var ml = decodeTiny(U.imap, (1<<tl)-1, HLIT , data, pos, U.ltree); ML = (1<<(ml>>>24))-1;  pos+=(ml&0xffffff);
			makeCodes(U.ltree, mx0);
			codes2map(U.ltree, mx0, lmap);
			
			//var md = decodeTiny(U.imap, (1<<tl)-1, HDIST, data, pos, U.dtree); MD = (1<<(md>>>24))-1;  pos+=(md&0xffffff);
			makeCodes(U.dtree, mx1);
			codes2map(U.dtree, mx1, dmap);
		}
		//var ooff=off, opos=pos;
		while(true) {
			var code = lmap[get17(data, pos) & ML];  pos += code&15;
			var lit = code>>>4;  //U.lhst[lit]++;  
			if((lit>>>8)==0) {  buf[off++] = lit;  }
			else if(lit==256) {  break;  }
			else {
				var end = off+lit-254;
				if(lit>264) { var ebs = U.ldef[lit-257];  end = off + (ebs>>>3) + bitsE(data, pos, ebs&7);  pos += ebs&7;  }
				//UZIP.F.dst[end-off]++;
				
				var dcode = dmap[get17(data, pos) & MD];  pos += dcode&15;
				var dlit = dcode>>>4;
				var dbs = U.ddef[dlit], dst = (dbs>>>4) + bitsF(data, pos, dbs&15);  pos += dbs&15;
				
				//var o0 = off-dst, stp = Math.min(end-off, dst);
				//if(stp>20) while(off<end) {  buf.copyWithin(off, o0, o0+stp);  off+=stp;  }  else
				//if(end-dst<=off) buf.copyWithin(off, off-dst, end-dst);  else
				//if(dst==1) buf.fill(buf[off-1], off, end);  else
				if(noBuf) buf=UZIP.F._check(buf, off+(1<<17));
				while(off<end) {  buf[off]=buf[off++-dst];    buf[off]=buf[off++-dst];  buf[off]=buf[off++-dst];  buf[off]=buf[off++-dst];  }   
				off=end;
				//while(off!=end) {  buf[off]=buf[off++-dst];  }
			}
		}
		//console.log(off-ooff, (pos-opos)>>>3);
	}
	//console.log(UZIP.F.dst);
	//console.log(tlen, dlen, off-tlen+tcnt);
	return buf.length==off ? buf : buf.slice(0,off);
}
UZIP.F._check=function(buf, len) {
	var bl=buf.length;  if(len<=bl) return buf;
	var nbuf = new Uint8Array(Math.max(bl<<1,len));  nbuf.set(buf,0);
	//for(var i=0; i<bl; i+=4) {  nbuf[i]=buf[i];  nbuf[i+1]=buf[i+1];  nbuf[i+2]=buf[i+2];  nbuf[i+3]=buf[i+3];  }
	return nbuf;
}

UZIP.F._decodeTiny = function(lmap, LL, len, data, pos, tree) {
	var bitsE = UZIP.F._bitsE, get17 = UZIP.F._get17;
	var i = 0;
	while(i<len) {
		var code = lmap[get17(data, pos)&LL];  pos+=code&15;
		var lit = code>>>4; 
		if(lit<=15) {  tree[i]=lit;  i++;  }
		else {
			var ll = 0, n = 0;
			if(lit==16) {
				n = (3  + bitsE(data, pos, 2));  pos += 2;  ll = tree[i-1];
			}
			else if(lit==17) {
				n = (3  + bitsE(data, pos, 3));  pos += 3;
			}
			else if(lit==18) {
				n = (11 + bitsE(data, pos, 7));  pos += 7;
			}
			var ni = i+n;
			while(i<ni) {  tree[i]=ll;  i++; }
		}
	}
	return pos;
}
UZIP.F._copyOut = function(src, off, len, tree) {
	var mx=0, i=0, tl=tree.length>>>1;
	while(i<len) {  var v=src[i+off];  tree[(i<<1)]=0;  tree[(i<<1)+1]=v;  if(v>mx)mx=v;  i++;  }
	while(i<tl ) {  tree[(i<<1)]=0;  tree[(i<<1)+1]=0;  i++;  }
	return mx;
}

UZIP.F.makeCodes = function(tree, MAX_BITS) {  // code, length
	var U = UZIP.F.U;
	var max_code = tree.length;
	var code, bits, n, i, len;
	
	var bl_count = U.bl_count;  for(var i=0; i<=MAX_BITS; i++) bl_count[i]=0;
	for(i=1; i<max_code; i+=2) bl_count[tree[i]]++;
	
	var next_code = U.next_code;	// smallest code for each length
	
	code = 0;
	bl_count[0] = 0;
	for (bits = 1; bits <= MAX_BITS; bits++) {
		code = (code + bl_count[bits-1]) << 1;
		next_code[bits] = code;
	}
	
	for (n = 0; n < max_code; n+=2) {
		len = tree[n+1];
		if (len != 0) {
			tree[n] = next_code[len];
			next_code[len]++;
		}
	}
}
UZIP.F.codes2map = function(tree, MAX_BITS, map) {
	var max_code = tree.length;
	var U=UZIP.F.U, r15 = U.rev15;
	for(var i=0; i<max_code; i+=2) if(tree[i+1]!=0)  {
		var lit = i>>1;
		var cl = tree[i+1], val = (lit<<4)|cl; // :  (0x8000 | (U.of0[lit-257]<<7) | (U.exb[lit-257]<<4) | cl);
		var rest = (MAX_BITS-cl), i0 = tree[i]<<rest, i1 = i0 + (1<<rest);
		//tree[i]=r15[i0]>>>(15-MAX_BITS);
		while(i0!=i1) {
			var p0 = r15[i0]>>>(15-MAX_BITS);
			map[p0]=val;  i0++;
		}
	}
}
UZIP.F.revCodes = function(tree, MAX_BITS) {
	var r15 = UZIP.F.U.rev15, imb = 15-MAX_BITS;
	for(var i=0; i<tree.length; i+=2) {  var i0 = (tree[i]<<(MAX_BITS-tree[i+1]));  tree[i] = r15[i0]>>>imb;  }
}

// used only in deflate
UZIP.F._putsE= function(dt, pos, val   ) {  val = val<<(pos&7);  var o=(pos>>>3);  dt[o]|=val;  dt[o+1]|=(val>>>8);                        }
UZIP.F._putsF= function(dt, pos, val   ) {  val = val<<(pos&7);  var o=(pos>>>3);  dt[o]|=val;  dt[o+1]|=(val>>>8);  dt[o+2]|=(val>>>16);  }

UZIP.F._bitsE= function(dt, pos, length) {  return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8)                        )>>>(pos&7))&((1<<length)-1);  }
UZIP.F._bitsF= function(dt, pos, length) {  return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8) | (dt[(pos>>>3)+2]<<16))>>>(pos&7))&((1<<length)-1);  }
/*
UZIP.F._get9 = function(dt, pos) {
	return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8))>>>(pos&7))&511;
} */
UZIP.F._get17= function(dt, pos) {	// return at least 17 meaningful bytes
	return (dt[pos>>>3] | (dt[(pos>>>3)+1]<<8) | (dt[(pos>>>3)+2]<<16) )>>>(pos&7);
}
UZIP.F._get25= function(dt, pos) {	// return at least 17 meaningful bytes
	return (dt[pos>>>3] | (dt[(pos>>>3)+1]<<8) | (dt[(pos>>>3)+2]<<16) | (dt[(pos>>>3)+3]<<24) )>>>(pos&7);
}
UZIP.F.U = function(){
	var u16=Uint16Array, u32=Uint32Array;
	return {
		next_code : new u16(16),
		bl_count  : new u16(16),
		ordr : [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ],
		of0  : [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],
		exb  : [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0,  0,  0,  0],
		ldef : new u16(32),
		df0  : [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577, 65535, 65535],
		dxb  : [0,0,0,0,1,1,2, 2, 3, 3, 4, 4, 5, 5,  6,  6,  7,  7,  8,  8,   9,   9,  10,  10,  11,  11,  12,   12,   13,   13,     0,     0],
		ddef : new u32(32),
		flmap: new u16(  512),  fltree: [],
		fdmap: new u16(   32),  fdtree: [],
		lmap : new u16(32768),  ltree : [],  ttree:[],
		dmap : new u16(32768),  dtree : [],
		imap : new u16(  512),  itree : [],
		//rev9 : new u16(  512)
		rev15: new u16(1<<15),
		lhst : new u32(286), dhst : new u32( 30), ihst : new u32(19),
		lits : new u32(15000),
		strt : new u16(1<<16),
		prev : new u16(1<<15)
	};  
} ();

(function(){	
	var U = UZIP.F.U;
	var len = 1<<15;
	for(var i=0; i<len; i++) {
		var x = i;
		x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
		x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
		x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
		x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
		U.rev15[i] = (((x >>> 16) | (x << 16)))>>>17;
	}
	
	function pushV(tgt, n, sv) {  while(n--!=0) tgt.push(0,sv);  }
	
	for(var i=0; i<32; i++) {  U.ldef[i]=(U.of0[i]<<3)|U.exb[i];  U.ddef[i]=(U.df0[i]<<4)|U.dxb[i];  }
	
	pushV(U.fltree, 144, 8);  pushV(U.fltree, 255-143, 9);  pushV(U.fltree, 279-255, 7);  pushV(U.fltree,287-279,8);
	/*
	var i = 0;
	for(; i<=143; i++) U.fltree.push(0,8);
	for(; i<=255; i++) U.fltree.push(0,9);
	for(; i<=279; i++) U.fltree.push(0,7);
	for(; i<=287; i++) U.fltree.push(0,8);
	*/
	UZIP.F.makeCodes(U.fltree, 9);
	UZIP.F.codes2map(U.fltree, 9, U.flmap);
	UZIP.F.revCodes (U.fltree, 9)
	
	pushV(U.fdtree,32,5);
	//for(i=0;i<32; i++) U.fdtree.push(0,5);
	UZIP.F.makeCodes(U.fdtree, 5);
	UZIP.F.codes2map(U.fdtree, 5, U.fdmap);
	UZIP.F.revCodes (U.fdtree, 5)
	
	pushV(U.itree,19,0);  pushV(U.ltree,286,0);  pushV(U.dtree,30,0);  pushV(U.ttree,320,0);
	/*
	for(var i=0; i< 19; i++) U.itree.push(0,0);
	for(var i=0; i<286; i++) U.ltree.push(0,0);
	for(var i=0; i< 30; i++) U.dtree.push(0,0);
	for(var i=0; i<320; i++) U.ttree.push(0,0);
	*/
})()


var paper=function(t,e){var i=(t=t||require("./node/self.js")).window,n=t.document,r=new function(){function t(t,e,r,s,a){function u(n,u){"string"==typeof(u=u||(u=o(e,n))&&(u.get?u:u.value))&&"#"===u[0]&&(u=t[u.substring(1)]||u);var c,f="function"==typeof u,d=u,_=a||f&&!u.base?u&&u.get?n in t:t[n]:null;a&&_||(f&&_&&(u.base=_),f&&!1!==s&&(c=n.match(/^([gs]et|is)(([A-Z])(.*))$/))&&(l[c[3].toLowerCase()+c[4]]=c[2]),d&&!f&&d.get&&"function"==typeof d.get&&i.isPlainObject(d)||(d={value:d,writable:!0}),(o(t,n)||{configurable:!0}).configurable&&(d.configurable=!0,d.enumerable=null!=r?r:!c),h(t,n,d))}var l={};if(e){for(var c in e)e.hasOwnProperty(c)&&!n.test(c)&&u(c);for(var c in l){var f=l[c],d=t["set"+f],_=t["get"+f]||d&&t["is"+f];!_||!0!==s&&0!==_.length||u(c,{get:_,set:d})}}return t}function i(){for(var t=0,e=arguments.length;t<e;t++){var i=arguments[t];i&&c(this,i)}return this}var n=/^(statics|enumerable|beans|preserve)$/,r=[],s=r.slice,a=Object.create,o=Object.getOwnPropertyDescriptor,h=Object.defineProperty,u=r.forEach||function(t,e){for(var i=0,n=this.length;i<n;i++)t.call(e,this[i],i,this)},l=function(t,e){for(var i in this)this.hasOwnProperty(i)&&t.call(e,this[i],i,this)},c=Object.assign||function(t){for(var e=1,i=arguments.length;e<i;e++){var n=arguments[e];for(var r in n)n.hasOwnProperty(r)&&(t[r]=n[r])}return t},f=function(t,e,i){if(t){var n=o(t,"length");(n&&"number"==typeof n.value?u:l).call(t,e,i=i||t)}return i};return t(i,{inject:function(e){if(e){var i=!0===e.statics?e:e.statics,n=e.beans,r=e.preserve;i!==e&&t(this.prototype,e,e.enumerable,n,r),t(this,i,null,n,r)}for(var s=1,a=arguments.length;s<a;s++)this.inject(arguments[s]);return this},extend:function(){for(var e,i,n,r=this,s=0,o=arguments.length;s<o&&(!e||!i);s++)n=arguments[s],e=e||n.initialize,i=i||n.prototype;return e=e||function(){r.apply(this,arguments)},i=e.prototype=i||a(this.prototype),h(i,"constructor",{value:e,writable:!0,configurable:!0}),t(e,this),arguments.length&&this.inject.apply(e,arguments),e.base=r,e}}).inject({enumerable:!1,initialize:i,set:i,inject:function(){for(var e=0,i=arguments.length;e<i;e++){var n=arguments[e];n&&t(this,n,n.enumerable,n.beans,n.preserve)}return this},extend:function(){var t=a(this);return t.inject.apply(t,arguments)},each:function(t,e){return f(this,t,e)},clone:function(){return new this.constructor(this)},statics:{set:c,each:f,create:a,define:h,describe:o,clone:function(t){return c(new t.constructor,t)},isPlainObject:function(t){var e=null!=t&&t.constructor;return e&&(e===Object||e===i||"Object"===e.name)},pick:function(t,i){return t!==e?t:i},slice:function(t,e,i){return s.call(t,e,i)}}})};"undefined"!=typeof module&&(module.exports=r),r.inject({enumerable:!1,toString:function(){return null!=this._id?(this._class||"Object")+(this._name?" '"+this._name+"'":" @"+this._id):"{ "+r.each(this,function(t,e){if(!/^_/.test(e)){var i=typeof t;this.push(e+": "+("number"===i?h.instance.number(t):"string"===i?"'"+t+"'":t))}},[]).join(", ")+" }"},getClassName:function(){return this._class||""},importJSON:function(t){return r.importJSON(t,this)},exportJSON:function(t){return r.exportJSON(this,t)},toJSON:function(){return r.serialize(this)},set:function(t,e){return t&&r.filter(this,t,e,this._prioritize),this}},{beans:!1,statics:{exports:{},extend:function t(){var e=t.base.apply(this,arguments),i=e.prototype._class;return i&&!r.exports[i]&&(r.exports[i]=e),e},equals:function(t,e){if(t===e)return!0;if(t&&t.equals)return t.equals(e);if(e&&e.equals)return e.equals(t);if(t&&e&&"object"==typeof t&&"object"==typeof e){if(Array.isArray(t)&&Array.isArray(e)){if((n=t.length)!==e.length)return!1;for(;n--;)if(!r.equals(t[n],e[n]))return!1}else{var i=Object.keys(t),n=i.length;if(n!==Object.keys(e).length)return!1;for(;n--;){var s=i[n];if(!e.hasOwnProperty(s)||!r.equals(t[s],e[s]))return!1}}return!0}return!1},read:function(t,i,n,s){if(this===r){var a=this.peek(t,i);return t.__index++,a}var o=this.prototype,h=o._readIndex,u=i||h&&t.__index||0,l=t.length,c=t[u];if(s=s||l-u,c instanceof this||n&&n.readNull&&null==c&&s<=1)return h&&(t.__index=u+1),c&&n&&n.clone?c.clone():c;if(c=r.create(o),h&&(c.__read=!0),c=c.initialize.apply(c,u>0||u+s<l?r.slice(t,u,u+s):t)||c,h){t.__index=u+c.__read;var f=c.__filtered;f&&(t.__filtered=f,c.__filtered=e),c.__read=e}return c},peek:function(t,e){return t[t.__index=e||t.__index||0]},remain:function(t){return t.length-(t.__index||0)},readList:function(t,e,i,n){for(var r,s=[],a=e||0,o=n?a+n:t.length,h=a;h<o;h++)s.push(Array.isArray(r=t[h])?this.read(r,0,i):this.read(t,h,i,1));return s},readNamed:function(t,i,n,s,a){var o=this.getNamed(t,i),h=o!==e;if(h){var u=t.__filtered;u||((u=t.__filtered=r.create(t[0])).__unfiltered=t[0]),u[i]=e}var l=h?[o]:t;return this.read(l,n,s,a)},getNamed:function(t,i){var n=t[0];if(t._hasObject===e&&(t._hasObject=1===t.length&&r.isPlainObject(n)),t._hasObject)return i?n[i]:t.__filtered||n},hasNamed:function(t,e){return!!this.getNamed(t,e)},filter:function(t,i,n,r){function s(r){if(!(n&&r in n||a&&r in a)){var s=i[r];s!==e&&(t[r]=s)}}var a;if(r){for(var o,h={},u=0,l=r.length;u<l;u++)(o=r[u])in i&&(s(o),h[o]=!0);a=h}return Object.keys(i.__unfiltered||i).forEach(s),t},isPlainValue:function(t,e){return r.isPlainObject(t)||Array.isArray(t)||e&&"string"==typeof t},serialize:function(t,e,i,n){e=e||{};var s,a=!n;if(a&&(e.formatter=new h(e.precision),n={length:0,definitions:{},references:{},add:function(t,e){var i="#"+t._id,n=this.references[i];if(!n){this.length++;var r=e.call(t),s=t._class;s&&r[0]!==s&&r.unshift(s),this.definitions[i]=r,n=this.references[i]=[i]}return n}}),t&&t._serialize){s=t._serialize(e,n);var o=t._class;!o||t._compactSerialize||!a&&i||s[0]===o||s.unshift(o)}else if(Array.isArray(t)){s=[];for(var u=0,l=t.length;u<l;u++)s[u]=r.serialize(t[u],e,i,n)}else if(r.isPlainObject(t)){s={};for(var c=Object.keys(t),u=0,l=c.length;u<l;u++){var f=c[u];s[f]=r.serialize(t[f],e,i,n)}}else s="number"==typeof t?e.formatter.number(t,e.precision):t;return a&&n.length>0?[["dictionary",n.definitions],s]:s},deserialize:function(t,e,i,n,s){var a=t,o=!i,h=o&&t&&t.length&&"dictionary"===t[0][0];if(i=i||{},Array.isArray(t)){var u=t[0],l="dictionary"===u;if(1==t.length&&/^#/.test(u))return i.dictionary[u];a=[];for(var c=(u=r.exports[u])?1:0,f=t.length;c<f;c++)a.push(r.deserialize(t[c],e,i,l,h));if(u){var d=a;e?a=e(u,d,o||s):(a=r.create(u.prototype),u.apply(a,d))}}else if(r.isPlainObject(t)){a={},n&&(i.dictionary=a);for(var _ in t)a[_]=r.deserialize(t[_],e,i)}return h?a[1]:a},exportJSON:function(t,e){var i=r.serialize(t,e);return e&&0==e.asString?i:JSON.stringify(i)},importJSON:function(t,e){return r.deserialize("string"==typeof t?JSON.parse(t):t,function(t,i,n){var s=n&&e&&e.constructor===t,a=s?e:r.create(t.prototype);if(1===i.length&&a instanceof w&&(s||!(a instanceof b))){var o=i[0];r.isPlainObject(o)&&(o.insert=!1)}return(s?a.set:t).apply(a,i),s&&(e=null),a})},splice:function(t,i,n,r){var s=i&&i.length,a=n===e;(n=a?t.length:n)>t.length&&(n=t.length);for(u=0;u<s;u++)i[u]._index=n+u;if(a)return t.push.apply(t,i),[];var o=[n,r];i&&o.push.apply(o,i);for(var h=t.splice.apply(t,o),u=0,l=h.length;u<l;u++)h[u]._index=e;for(var u=n+s,l=t.length;u<l;u++)t[u]._index=u;return h},capitalize:function(t){return t.replace(/\b[a-z]/g,function(t){return t.toUpperCase()})},camelize:function(t){return t.replace(/-(.)/g,function(t,e){return e.toUpperCase()})},hyphenate:function(t){return t.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase()}}});var s={on:function(t,e){if("string"!=typeof t)r.each(t,function(t,e){this.on(e,t)},this);else{var i=this._eventTypes,n=i&&i[t],s=this._callbacks=this._callbacks||{};-1===(s=s[t]=s[t]||[]).indexOf(e)&&(s.push(e),n&&n.install&&1===s.length&&n.install.call(this,t))}return this},off:function(t,e){if("string"==typeof t){var i,n=this._eventTypes,s=n&&n[t],a=this._callbacks&&this._callbacks[t];return a&&(!e||-1!==(i=a.indexOf(e))&&1===a.length?(s&&s.uninstall&&s.uninstall.call(this,t),delete this._callbacks[t]):-1!==i&&a.splice(i,1)),this}r.each(t,function(t,e){this.off(e,t)},this)},once:function(t,e){return this.on(t,function(){e.apply(this,arguments),this.off(t,e)})},emit:function(t,e){var i=this._callbacks&&this._callbacks[t];if(!i)return!1;var n=r.slice(arguments,1),s=e&&e.target&&!e.currentTarget;i=i.slice(),s&&(e.currentTarget=this);for(var a=0,o=i.length;a<o;a++)if(0==i[a].apply(this,n)){e&&e.stop&&e.stop();break}return s&&delete e.currentTarget,!0},responds:function(t){return!(!this._callbacks||!this._callbacks[t])},attach:"#on",detach:"#off",fire:"#emit",_installEvents:function(t){var e=this._eventTypes,i=this._callbacks,n=t?"install":"uninstall";if(e)for(var r in i)if(i[r].length>0){var s=e[r],a=s&&s[n];a&&a.call(this,r)}},statics:{inject:function t(e){var i=e._events;if(i){var n={};r.each(i,function(t,i){var s="string"==typeof t,a=s?t:i,o=r.capitalize(a),h=a.substring(2).toLowerCase();n[h]=s?{}:t,a="_"+a,e["get"+o]=function(){return this[a]},e["set"+o]=function(t){var e=this[a];e&&this.off(h,e),t&&this.on(h,t),this[a]=t}}),e._eventTypes=n}return t.base.apply(this,arguments)}}},a=r.extend({_class:"PaperScope",initialize:function e(){paper=this,this.settings=new r({applyMatrix:!0,insertItems:!0,handleSize:4,hitTolerance:0}),this.project=null,this.projects=[],this.tools=[],this._id=e._id++,e._scopes[this._id]=this;var i=e.prototype;if(!this.support){var n=Q.getContext(1,1)||{};i.support={nativeDash:"setLineDash"in n||"mozDash"in n,nativeBlendModes:tt.nativeModes},Q.release(n)}if(!this.agent){var s=t.navigator.userAgent.toLowerCase(),a=(/(darwin|win|mac|linux|freebsd|sunos)/.exec(s)||[])[0],o="darwin"===a?"mac":a,h=i.agent=i.browser={platform:o};o&&(h[o]=!0),s.replace(/(opera|chrome|safari|webkit|firefox|msie|trident|atom|node)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv\:v?([.\d]+))?/g,function(t,e,i,n,r){if(!h.chrome){var s="opera"===e?n:/^(node|trident)$/.test(e)?r:i;h.version=s,h.versionNumber=parseFloat(s),e="trident"===e?"msie":e,h.name=e,h[e]=!0}}),h.chrome&&delete h.webkit,h.atom&&delete h.chrome}},version:"0.11.5",getView:function(){var t=this.project;return t&&t._view},getPaper:function(){return this},execute:function(t,e){paper.PaperScript.execute(t,this,e),U.updateFocus()},install:function(t){var e=this;r.each(["project","view","tool"],function(i){r.define(t,i,{configurable:!0,get:function(){return e[i]}})});for(var i in this)!/^_/.test(i)&&this[i]&&(t[i]=this[i])},setup:function(t){return paper=this,this.project=new y(t),this},createCanvas:function(t,e){return Q.getCanvas(t,e)},activate:function(){paper=this},clear:function(){for(var t=this.projects,e=this.tools,i=t.length-1;i>=0;i--)t[i].remove();for(i=e.length-1;i>=0;i--)e[i].remove()},remove:function(){this.clear(),delete a._scopes[this._id]},statics:new function(){function t(t){return t+="Attribute",function(e,i){return e[t](i)||e[t]("data-paper-"+i)}}return{_scopes:{},_id:0,get:function(t){return this._scopes[t]||null},getAttribute:t("get"),hasAttribute:t("has")}}}),o=r.extend(s,{initialize:function(t){this._scope=paper,this._index=this._scope[this._list].push(this)-1,!t&&this._scope[this._reference]||this.activate()},activate:function(){if(!this._scope)return!1;var t=this._scope[this._reference];return t&&t!==this&&t.emit("deactivate"),this._scope[this._reference]=this,this.emit("activate",t),!0},isActive:function(){return this._scope[this._reference]===this},remove:function(){return null!=this._index&&(r.splice(this._scope[this._list],null,this._index,1),this._scope[this._reference]==this&&(this._scope[this._reference]=null),this._scope=null,!0)},getView:function(){return this._scope.getView()}}),h=r.extend({initialize:function(t){this.precision=r.pick(t,5),this.multiplier=Math.pow(10,this.precision)},number:function(t){return this.precision<16?Math.round(t*this.multiplier)/this.multiplier:t},pair:function(t,e,i){return this.number(t)+(i||",")+this.number(e)},point:function(t,e){return this.number(t.x)+(e||",")+this.number(t.y)},size:function(t,e){return this.number(t.width)+(e||",")+this.number(t.height)},rectangle:function(t,e){return this.point(t,e)+(e||",")+this.size(t,e)}});h.instance=new h;var u=new function(){function t(t,e,i){return t<e?e:t>i?i:t}function e(t,e,i){function n(t){var e=134217729*t,i=t-e+e;return[i,t-i]}var r=e*e-t*i,a=e*e+t*i;if(3*s(r)<a){var o=n(t),h=n(e),u=n(i),l=e*e,c=t*i;r=l-c+(h[0]*h[0]-l+2*h[0]*h[1]+h[1]*h[1]-(o[0]*u[0]-c+o[0]*u[1]+o[1]*u[0]+o[1]*u[1]))}return r}function i(){var t=Math.max.apply(Math,arguments);return t&&(t<1e-8||t>1e8)?o(2,-Math.round(h(t))):0}var n=[[.5773502691896257],[0,.7745966692414834],[.33998104358485626,.8611363115940526],[0,.5384693101056831,.906179845938664],[.2386191860831969,.6612093864662645,.932469514203152],[0,.4058451513773972,.7415311855993945,.9491079123427585],[.1834346424956498,.525532409916329,.7966664774136267,.9602898564975363],[0,.3242534234038089,.6133714327005904,.8360311073266358,.9681602395076261],[.14887433898163122,.4333953941292472,.6794095682990244,.8650633666889845,.9739065285171717],[0,.26954315595234496,.5190961292068118,.7301520055740494,.8870625997680953,.978228658146057],[.1252334085114689,.3678314989981802,.5873179542866175,.7699026741943047,.9041172563704749,.9815606342467192],[0,.2304583159551348,.44849275103644687,.6423493394403402,.8015780907333099,.9175983992229779,.9841830547185881],[.10805494870734367,.31911236892788974,.5152486363581541,.6872929048116855,.827201315069765,.9284348836635735,.9862838086968123],[0,.20119409399743451,.3941513470775634,.5709721726085388,.7244177313601701,.8482065834104272,.937273392400706,.9879925180204854],[.09501250983763744,.2816035507792589,.45801677765722737,.6178762444026438,.755404408355003,.8656312023878318,.9445750230732326,.9894009349916499]],r=[[1],[.8888888888888888,.5555555555555556],[.6521451548625461,.34785484513745385],[.5688888888888889,.47862867049936647,.23692688505618908],[.46791393457269104,.3607615730481386,.17132449237917036],[.4179591836734694,.3818300505051189,.27970539148927664,.1294849661688697],[.362683783378362,.31370664587788727,.22238103445337448,.10122853629037626],[.3302393550012598,.31234707704000286,.26061069640293544,.1806481606948574,.08127438836157441],[.29552422471475287,.26926671930999635,.21908636251598204,.1494513491505806,.06667134430868814],[.2729250867779006,.26280454451024665,.23319376459199048,.18629021092773426,.1255803694649046,.05566856711617366],[.24914704581340277,.2334925365383548,.20316742672306592,.16007832854334622,.10693932599531843,.04717533638651183],[.2325515532308739,.22628318026289723,.2078160475368885,.17814598076194574,.13887351021978725,.09212149983772845,.04048400476531588],[.2152638534631578,.2051984637212956,.18553839747793782,.15720316715819355,.12151857068790319,.08015808715976021,.03511946033175186],[.2025782419255613,.19843148532711158,.1861610000155622,.16626920581699392,.13957067792615432,.10715922046717194,.07036604748810812,.03075324199611727],[.1894506104550685,.18260341504492358,.16915651939500254,.14959598881657674,.12462897125553388,.09515851168249279,.062253523938647894,.027152459411754096]],s=Math.abs,a=Math.sqrt,o=Math.pow,h=Math.log2||function(t){return Math.log(t)*Math.LOG2E};return{EPSILON:1e-12,MACHINE_EPSILON:1.12e-16,CURVETIME_EPSILON:1e-8,GEOMETRIC_EPSILON:1e-7,TRIGONOMETRIC_EPSILON:1e-8,KAPPA:4*(a(2)-1)/3,isZero:function(t){return t>=-1e-12&&t<=1e-12},clamp:t,integrate:function(t,e,i,s){for(var a=n[s-2],o=r[s-2],h=.5*(i-e),u=h+e,l=0,c=s+1>>1,f=1&s?o[l++]*t(u):0;l<c;){var d=h*a[l];f+=o[l++]*(t(u+d)+t(u-d))}return h*f},findRoot:function(e,i,n,r,a,o,h){for(var u=0;u<o;u++){var l=e(n),c=l/i(n),f=n-c;if(s(c)<h){n=f;break}l>0?(a=n,n=f<=r?.5*(r+a):f):(r=n,n=f>=a?.5*(r+a):f)}return t(n,r,a)},solveQuadratic:function(n,r,o,h,u,l){var c,f=1/0;if(s(n)<1e-12){if(s(r)<1e-12)return s(o)<1e-12?-1:0;c=-o/r}else{var d=e(n,r*=-.5,o);if(d&&s(d)<1.12e-16){var _=i(s(n),s(r),s(o));_&&(d=e(n*=_,r*=_,o*=_))}if(d>=-1.12e-16){var g=d<0?0:a(d),v=r+(r<0?-g:g);0===v?f=-(c=o/n):(c=v/n,f=o/v)}}var p=0,m=null==u,y=u-1e-12,w=l+1e-12;return isFinite(c)&&(m||c>y&&c<w)&&(h[p++]=m?c:t(c,u,l)),f!==c&&isFinite(f)&&(m||f>y&&f<w)&&(h[p++]=m?f:t(f,u,l)),p},solveCubic:function(e,n,r,h,l,c,f){function d(t){var i=e*(_=t);p=(i+(g=i+n))*_+(v=g*_+r),m=v*_+h}var _,g,v,p,m,y=i(s(e),s(n),s(r),s(h));if(y&&(e*=y,n*=y,r*=y,h*=y),s(e)<1e-12)e=n,g=r,v=h,_=1/0;else if(s(h)<1e-12)g=n,v=r,_=0;else{d(-n/e/3);var w=m/e,x=o(s(w),1/3),b=w<0?-1:1,C=-p/e,S=C>0?1.324717957244746*Math.max(x,a(C)):x,P=_-b*S;if(P!==_){do{d(P),P=0===p?_:_-m/p/(1+1.12e-16)}while(b*P>b*_);s(e)*_*_>s(h/_)&&(g=((v=-h/_)-r)/_)}}var I=u.solveQuadratic(e,g,v,l,c,f),M=null==c;return isFinite(_)&&(0===I||I>0&&_!==l[0]&&_!==l[1])&&(M||_>c-1e-12&&_<f+1e-12)&&(l[I++]=M?_:t(_,c,f)),I}}},l={_id:1,_pools:{},get:function(t){if(t){var e=this._pools[t];return e||(e=this._pools[t]={_id:1}),e._id++}return this._id++}},c=r.extend({_class:"Point",_readIndex:!0,initialize:function(t,e){var i=typeof t,n=this.__read,r=0;if("number"===i){var s="number"==typeof e;this._set(t,s?e:t),n&&(r=s?2:1)}else if("undefined"===i||null===t)this._set(0,0),n&&(r=null===t?1:0);else{var a="string"===i?t.split(/[\s,]+/)||[]:t;r=1,Array.isArray(a)?this._set(+a[0],+(a.length>1?a[1]:a[0])):"x"in a?this._set(a.x||0,a.y||0):"width"in a?this._set(a.width||0,a.height||0):"angle"in a?(this._set(a.length||0,0),this.setAngle(a.angle||0)):(this._set(0,0),r=0)}return n&&(this.__read=r),this},set:"#initialize",_set:function(t,e){return this.x=t,this.y=e,this},equals:function(t){return this===t||t&&(this.x===t.x&&this.y===t.y||Array.isArray(t)&&this.x===t[0]&&this.y===t[1])||!1},clone:function(){return new c(this.x,this.y)},toString:function(){var t=h.instance;return"{ x: "+t.number(this.x)+", y: "+t.number(this.y)+" }"},_serialize:function(t){var e=t.formatter;return[e.number(this.x),e.number(this.y)]},getLength:function(){return Math.sqrt(this.x*this.x+this.y*this.y)},setLength:function(t){if(this.isZero()){var e=this._angle||0;this._set(Math.cos(e)*t,Math.sin(e)*t)}else{var i=t/this.getLength();u.isZero(i)&&this.getAngle(),this._set(this.x*i,this.y*i)}},getAngle:function(){return 180*this.getAngleInRadians.apply(this,arguments)/Math.PI},setAngle:function(t){this.setAngleInRadians.call(this,t*Math.PI/180)},getAngleInDegrees:"#getAngle",setAngleInDegrees:"#setAngle",getAngleInRadians:function(){if(arguments.length){var t=c.read(arguments),e=this.getLength()*t.getLength();if(u.isZero(e))return NaN;var i=this.dot(t)/e;return Math.acos(i<-1?-1:i>1?1:i)}return this.isZero()?this._angle||0:this._angle=Math.atan2(this.y,this.x)},setAngleInRadians:function(t){if(this._angle=t,!this.isZero()){var e=this.getLength();this._set(Math.cos(t)*e,Math.sin(t)*e)}},getQuadrant:function(){return this.x>=0?this.y>=0?1:4:this.y>=0?2:3}},{beans:!1,getDirectedAngle:function(){var t=c.read(arguments);return 180*Math.atan2(this.cross(t),this.dot(t))/Math.PI},getDistance:function(){var t=c.read(arguments),e=t.x-this.x,i=t.y-this.y,n=e*e+i*i;return r.read(arguments)?n:Math.sqrt(n)},normalize:function(t){t===e&&(t=1);var i=this.getLength(),n=0!==i?t/i:0,r=new c(this.x*n,this.y*n);return n>=0&&(r._angle=this._angle),r},rotate:function(t,e){if(0===t)return this.clone();t=t*Math.PI/180;var i=e?this.subtract(e):this,n=Math.sin(t),r=Math.cos(t);return i=new c(i.x*r-i.y*n,i.x*n+i.y*r),e?i.add(e):i},transform:function(t){return t?t._transformPoint(this):this},add:function(){var t=c.read(arguments);return new c(this.x+t.x,this.y+t.y)},subtract:function(){var t=c.read(arguments);return new c(this.x-t.x,this.y-t.y)},multiply:function(){var t=c.read(arguments);return new c(this.x*t.x,this.y*t.y)},divide:function(){var t=c.read(arguments);return new c(this.x/t.x,this.y/t.y)},modulo:function(){var t=c.read(arguments);return new c(this.x%t.x,this.y%t.y)},negate:function(){return new c(-this.x,-this.y)},isInside:function(){return g.read(arguments).contains(this)},isClose:function(){var t=c.read(arguments),e=r.read(arguments);return this.getDistance(t)<=e},isCollinear:function(){var t=c.read(arguments);return c.isCollinear(this.x,this.y,t.x,t.y)},isColinear:"#isCollinear",isOrthogonal:function(){var t=c.read(arguments);return c.isOrthogonal(this.x,this.y,t.x,t.y)},isZero:function(){var t=u.isZero;return t(this.x)&&t(this.y)},isNaN:function(){return isNaN(this.x)||isNaN(this.y)},isInQuadrant:function(t){return this.x*(t>1&&t<4?-1:1)>=0&&this.y*(t>2?-1:1)>=0},dot:function(){var t=c.read(arguments);return this.x*t.x+this.y*t.y},cross:function(){var t=c.read(arguments);return this.x*t.y-this.y*t.x},project:function(){var t=c.read(arguments),e=t.isZero()?0:this.dot(t)/t.dot(t);return new c(t.x*e,t.y*e)},statics:{min:function(){var t=c.read(arguments),e=c.read(arguments);return new c(Math.min(t.x,e.x),Math.min(t.y,e.y))},max:function(){var t=c.read(arguments),e=c.read(arguments);return new c(Math.max(t.x,e.x),Math.max(t.y,e.y))},random:function(){return new c(Math.random(),Math.random())},isCollinear:function(t,e,i,n){return Math.abs(t*n-e*i)<=1e-8*Math.sqrt((t*t+e*e)*(i*i+n*n))},isOrthogonal:function(t,e,i,n){return Math.abs(t*i+e*n)<=1e-8*Math.sqrt((t*t+e*e)*(i*i+n*n))}}},r.each(["round","ceil","floor","abs"],function(t){var e=Math[t];this[t]=function(){return new c(e(this.x),e(this.y))}},{})),f=c.extend({initialize:function(t,e,i,n){this._x=t,this._y=e,this._owner=i,this._setter=n},_set:function(t,e,i){return this._x=t,this._y=e,i||this._owner[this._setter](this),this},getX:function(){return this._x},setX:function(t){this._x=t,this._owner[this._setter](this)},getY:function(){return this._y},setY:function(t){this._y=t,this._owner[this._setter](this)},isSelected:function(){return!!(this._owner._selection&this._getSelection())},setSelected:function(t){this._owner._changeSelection(this._getSelection(),t)},_getSelection:function(){return"setPosition"===this._setter?4:0}}),d=r.extend({_class:"Size",_readIndex:!0,initialize:function(t,e){var i=typeof t,n=this.__read,r=0;if("number"===i){var s="number"==typeof e;this._set(t,s?e:t),n&&(r=s?2:1)}else if("undefined"===i||null===t)this._set(0,0),n&&(r=null===t?1:0);else{var a="string"===i?t.split(/[\s,]+/)||[]:t;r=1,Array.isArray(a)?this._set(+a[0],+(a.length>1?a[1]:a[0])):"width"in a?this._set(a.width||0,a.height||0):"x"in a?this._set(a.x||0,a.y||0):(this._set(0,0),r=0)}return n&&(this.__read=r),this},set:"#initialize",_set:function(t,e){return this.width=t,this.height=e,this},equals:function(t){return t===this||t&&(this.width===t.width&&this.height===t.height||Array.isArray(t)&&this.width===t[0]&&this.height===t[1])||!1},clone:function(){return new d(this.width,this.height)},toString:function(){var t=h.instance;return"{ width: "+t.number(this.width)+", height: "+t.number(this.height)+" }"},_serialize:function(t){var e=t.formatter;return[e.number(this.width),e.number(this.height)]},add:function(){var t=d.read(arguments);return new d(this.width+t.width,this.height+t.height)},subtract:function(){var t=d.read(arguments);return new d(this.width-t.width,this.height-t.height)},multiply:function(){var t=d.read(arguments);return new d(this.width*t.width,this.height*t.height)},divide:function(){var t=d.read(arguments);return new d(this.width/t.width,this.height/t.height)},modulo:function(){var t=d.read(arguments);return new d(this.width%t.width,this.height%t.height)},negate:function(){return new d(-this.width,-this.height)},isZero:function(){var t=u.isZero;return t(this.width)&&t(this.height)},isNaN:function(){return isNaN(this.width)||isNaN(this.height)},statics:{min:function(t,e){return new d(Math.min(t.width,e.width),Math.min(t.height,e.height))},max:function(t,e){return new d(Math.max(t.width,e.width),Math.max(t.height,e.height))},random:function(){return new d(Math.random(),Math.random())}}},r.each(["round","ceil","floor","abs"],function(t){var e=Math[t];this[t]=function(){return new d(e(this.width),e(this.height))}},{})),_=d.extend({initialize:function(t,e,i,n){this._width=t,this._height=e,this._owner=i,this._setter=n},_set:function(t,e,i){return this._width=t,this._height=e,i||this._owner[this._setter](this),this},getWidth:function(){return this._width},setWidth:function(t){this._width=t,this._owner[this._setter](this)},getHeight:function(){return this._height},setHeight:function(t){this._height=t,this._owner[this._setter](this)}}),g=r.extend({_class:"Rectangle",_readIndex:!0,beans:!0,initialize:function(t,i,n,s){var a,o=typeof t;if("number"===o?(this._set(t,i,n,s),a=4):"undefined"===o||null===t?(this._set(0,0,0,0),a=null===t?1:0):1===arguments.length&&(Array.isArray(t)?(this._set.apply(this,t),a=1):t.x!==e||t.width!==e?(this._set(t.x||0,t.y||0,t.width||0,t.height||0),a=1):t.from===e&&t.to===e&&(this._set(0,0,0,0),r.filter(this,t),a=1)),a===e){var h,u,l=c.readNamed(arguments,"from"),f=r.peek(arguments),_=l.x,g=l.y;if(f&&f.x!==e||r.hasNamed(arguments,"to")){var v=c.readNamed(arguments,"to");h=v.x-_,u=v.y-g,h<0&&(_=v.x,h=-h),u<0&&(g=v.y,u=-u)}else{var p=d.read(arguments);h=p.width,u=p.height}this._set(_,g,h,u),a=arguments.__index;var m=arguments.__filtered;m&&(this.__filtered=m)}return this.__read&&(this.__read=a),this},set:"#initialize",_set:function(t,e,i,n){return this.x=t,this.y=e,this.width=i,this.height=n,this},clone:function(){return new g(this.x,this.y,this.width,this.height)},equals:function(t){var e=r.isPlainValue(t)?g.read(arguments):t;return e===this||e&&this.x===e.x&&this.y===e.y&&this.width===e.width&&this.height===e.height||!1},toString:function(){var t=h.instance;return"{ x: "+t.number(this.x)+", y: "+t.number(this.y)+", width: "+t.number(this.width)+", height: "+t.number(this.height)+" }"},_serialize:function(t){var e=t.formatter;return[e.number(this.x),e.number(this.y),e.number(this.width),e.number(this.height)]},getPoint:function(t){return new(t?c:f)(this.x,this.y,this,"setPoint")},setPoint:function(){var t=c.read(arguments);this.x=t.x,this.y=t.y},getSize:function(t){return new(t?d:_)(this.width,this.height,this,"setSize")},_fw:1,_fh:1,setSize:function(){var t=d.read(arguments),e=this._sx,i=this._sy,n=t.width,r=t.height;e&&(this.x+=(this.width-n)*e),i&&(this.y+=(this.height-r)*i),this.width=n,this.height=r,this._fw=this._fh=1},getLeft:function(){return this.x},setLeft:function(t){if(!this._fw){var e=t-this.x;this.width-=.5===this._sx?2*e:e}this.x=t,this._sx=this._fw=0},getTop:function(){return this.y},setTop:function(t){if(!this._fh){var e=t-this.y;this.height-=.5===this._sy?2*e:e}this.y=t,this._sy=this._fh=0},getRight:function(){return this.x+this.width},setRight:function(t){if(!this._fw){var e=t-this.x;this.width=.5===this._sx?2*e:e}this.x=t-this.width,this._sx=1,this._fw=0},getBottom:function(){return this.y+this.height},setBottom:function(t){if(!this._fh){var e=t-this.y;this.height=.5===this._sy?2*e:e}this.y=t-this.height,this._sy=1,this._fh=0},getCenterX:function(){return this.x+this.width/2},setCenterX:function(t){this._fw||.5===this._sx?this.x=t-this.width/2:(this._sx&&(this.x+=2*(t-this.x)*this._sx),this.width=2*(t-this.x)),this._sx=.5,this._fw=0},getCenterY:function(){return this.y+this.height/2},setCenterY:function(t){this._fh||.5===this._sy?this.y=t-this.height/2:(this._sy&&(this.y+=2*(t-this.y)*this._sy),this.height=2*(t-this.y)),this._sy=.5,this._fh=0},getCenter:function(t){return new(t?c:f)(this.getCenterX(),this.getCenterY(),this,"setCenter")},setCenter:function(){var t=c.read(arguments);return this.setCenterX(t.x),this.setCenterY(t.y),this},getArea:function(){return this.width*this.height},isEmpty:function(){return 0===this.width||0===this.height},contains:function(t){return t&&t.width!==e||4===(Array.isArray(t)?t:arguments).length?this._containsRectangle(g.read(arguments)):this._containsPoint(c.read(arguments))},_containsPoint:function(t){var e=t.x,i=t.y;return e>=this.x&&i>=this.y&&e<=this.x+this.width&&i<=this.y+this.height},_containsRectangle:function(t){var e=t.x,i=t.y;return e>=this.x&&i>=this.y&&e+t.width<=this.x+this.width&&i+t.height<=this.y+this.height},intersects:function(){var t=g.read(arguments),e=r.read(arguments)||0;return t.x+t.width>this.x-e&&t.y+t.height>this.y-e&&t.x<this.x+this.width+e&&t.y<this.y+this.height+e},intersect:function(){var t=g.read(arguments),e=Math.max(this.x,t.x),i=Math.max(this.y,t.y),n=Math.min(this.x+this.width,t.x+t.width),r=Math.min(this.y+this.height,t.y+t.height);return new g(e,i,n-e,r-i)},unite:function(){var t=g.read(arguments),e=Math.min(this.x,t.x),i=Math.min(this.y,t.y),n=Math.max(this.x+this.width,t.x+t.width),r=Math.max(this.y+this.height,t.y+t.height);return new g(e,i,n-e,r-i)},include:function(){var t=c.read(arguments),e=Math.min(this.x,t.x),i=Math.min(this.y,t.y),n=Math.max(this.x+this.width,t.x),r=Math.max(this.y+this.height,t.y);return new g(e,i,n-e,r-i)},expand:function(){var t=d.read(arguments),e=t.width,i=t.height;return new g(this.x-e/2,this.y-i/2,this.width+e,this.height+i)},scale:function(t,i){return this.expand(this.width*t-this.width,this.height*(i===e?t:i)-this.height)}},r.each([["Top","Left"],["Top","Right"],["Bottom","Left"],["Bottom","Right"],["Left","Center"],["Top","Center"],["Right","Center"],["Bottom","Center"]],function(t,e){var i=t.join(""),n=/^[RL]/.test(i);e>=4&&(t[1]+=n?"Y":"X");var r=t[n?0:1],s=t[n?1:0],a="get"+r,o="get"+s,h="set"+r,u="set"+s,l="set"+i;this["get"+i]=function(t){return new(t?c:f)(this[a](),this[o](),this,l)},this[l]=function(){var t=c.read(arguments);this[h](t.x),this[u](t.y)}},{beans:!0})),v=g.extend({initialize:function(t,e,i,n,r,s){this._set(t,e,i,n,!0),this._owner=r,this._setter=s},_set:function(t,e,i,n,r){return this._x=t,this._y=e,this._width=i,this._height=n,r||this._owner[this._setter](this),this}},new function(){var t=g.prototype;return r.each(["x","y","width","height"],function(t){var e=r.capitalize(t),i="_"+t;this["get"+e]=function(){return this[i]},this["set"+e]=function(t){this[i]=t,this._dontNotify||this._owner[this._setter](this)}},r.each(["Point","Size","Center","Left","Top","Right","Bottom","CenterX","CenterY","TopLeft","TopRight","BottomLeft","BottomRight","LeftCenter","TopCenter","RightCenter","BottomCenter"],function(e){var i="set"+e;this[i]=function(){this._dontNotify=!0,t[i].apply(this,arguments),this._dontNotify=!1,this._owner[this._setter](this)}},{isSelected:function(){return!!(2&this._owner._selection)},setSelected:function(t){var e=this._owner;e._changeSelection&&e._changeSelection(2,t)}}))}),p=r.extend({_class:"Matrix",initialize:function t(e,i){var n=arguments.length,r=!0;if(n>=6?this._set.apply(this,arguments):1===n||2===n?e instanceof t?this._set(e._a,e._b,e._c,e._d,e._tx,e._ty,i):Array.isArray(e)?this._set.apply(this,i?e.concat([i]):e):r=!1:n?r=!1:this.reset(),!r)throw new Error("Unsupported matrix parameters");return this},set:"#initialize",_set:function(t,e,i,n,r,s,a){return this._a=t,this._b=e,this._c=i,this._d=n,this._tx=r,this._ty=s,a||this._changed(),this},_serialize:function(t,e){return r.serialize(this.getValues(),t,!0,e)},_changed:function(){var t=this._owner;t&&(t._applyMatrix?t.transform(null,!0):t._changed(9))},clone:function(){return new p(this._a,this._b,this._c,this._d,this._tx,this._ty)},equals:function(t){return t===this||t&&this._a===t._a&&this._b===t._b&&this._c===t._c&&this._d===t._d&&this._tx===t._tx&&this._ty===t._ty},toString:function(){var t=h.instance;return"[["+[t.number(this._a),t.number(this._c),t.number(this._tx)].join(", ")+"], ["+[t.number(this._b),t.number(this._d),t.number(this._ty)].join(", ")+"]]"},reset:function(t){return this._a=this._d=1,this._b=this._c=this._tx=this._ty=0,t||this._changed(),this},apply:function(t,e){var i=this._owner;return!!i&&(i.transform(null,!0,r.pick(t,!0),e),this.isIdentity())},translate:function(){var t=c.read(arguments),e=t.x,i=t.y;return this._tx+=e*this._a+i*this._c,this._ty+=e*this._b+i*this._d,this._changed(),this},scale:function(){var t=c.read(arguments),e=c.read(arguments,0,{readNull:!0});return e&&this.translate(e),this._a*=t.x,this._b*=t.x,this._c*=t.y,this._d*=t.y,e&&this.translate(e.negate()),this._changed(),this},rotate:function(t){t*=Math.PI/180;var e=c.read(arguments,1),i=e.x,n=e.y,r=Math.cos(t),s=Math.sin(t),a=i-i*r+n*s,o=n-i*s-n*r,h=this._a,u=this._b,l=this._c,f=this._d;return this._a=r*h+s*l,this._b=r*u+s*f,this._c=-s*h+r*l,this._d=-s*u+r*f,this._tx+=a*h+o*l,this._ty+=a*u+o*f,this._changed(),this},shear:function(){var t=c.read(arguments),e=c.read(arguments,0,{readNull:!0});e&&this.translate(e);var i=this._a,n=this._b;return this._a+=t.y*this._c,this._b+=t.y*this._d,this._c+=t.x*i,this._d+=t.x*n,e&&this.translate(e.negate()),this._changed(),this},skew:function(){var t=c.read(arguments),e=c.read(arguments,0,{readNull:!0}),i=Math.PI/180,n=new c(Math.tan(t.x*i),Math.tan(t.y*i));return this.shear(n,e)},append:function(t,e){if(t){var i=this._a,n=this._b,r=this._c,s=this._d,a=t._a,o=t._c,h=t._b,u=t._d,l=t._tx,c=t._ty;this._a=a*i+h*r,this._c=o*i+u*r,this._b=a*n+h*s,this._d=o*n+u*s,this._tx+=l*i+c*r,this._ty+=l*n+c*s,e||this._changed()}return this},prepend:function(t,e){if(t){var i=this._a,n=this._b,r=this._c,s=this._d,a=this._tx,o=this._ty,h=t._a,u=t._c,l=t._b,c=t._d,f=t._tx,d=t._ty;this._a=h*i+u*n,this._c=h*r+u*s,this._b=l*i+c*n,this._d=l*r+c*s,this._tx=h*a+u*o+f,this._ty=l*a+c*o+d,e||this._changed()}return this},appended:function(t){return this.clone().append(t)},prepended:function(t){return this.clone().prepend(t)},invert:function(){var t=this._a,e=this._b,i=this._c,n=this._d,r=this._tx,s=this._ty,a=t*n-e*i,o=null;return a&&!isNaN(a)&&isFinite(r)&&isFinite(s)&&(this._a=n/a,this._b=-e/a,this._c=-i/a,this._d=t/a,this._tx=(i*s-n*r)/a,this._ty=(e*r-t*s)/a,o=this),o},inverted:function(){return this.clone().invert()},concatenate:"#append",preConcatenate:"#prepend",chain:"#appended",_shiftless:function(){return new p(this._a,this._b,this._c,this._d,0,0)},_orNullIfIdentity:function(){return this.isIdentity()?null:this},isIdentity:function(){return 1===this._a&&0===this._b&&0===this._c&&1===this._d&&0===this._tx&&0===this._ty},isInvertible:function(){var t=this._a*this._d-this._c*this._b;return t&&!isNaN(t)&&isFinite(this._tx)&&isFinite(this._ty)},isSingular:function(){return!this.isInvertible()},transform:function(t,e,i){return arguments.length<3?this._transformPoint(c.read(arguments)):this._transformCoordinates(t,e,i)},_transformPoint:function(t,e,i){var n=t.x,r=t.y;return e||(e=new c),e._set(n*this._a+r*this._c+this._tx,n*this._b+r*this._d+this._ty,i)},_transformCoordinates:function(t,e,i){for(var n=0,r=2*i;n<r;n+=2){var s=t[n],a=t[n+1];e[n]=s*this._a+a*this._c+this._tx,e[n+1]=s*this._b+a*this._d+this._ty}return e},_transformCorners:function(t){var e=t.x,i=t.y,n=e+t.width,r=i+t.height,s=[e,i,n,i,n,r,e,r];return this._transformCoordinates(s,s,4)},_transformBounds:function(t,e,i){for(var n=this._transformCorners(t),r=n.slice(0,2),s=r.slice(),a=2;a<8;a++){var o=n[a],h=1&a;o<r[h]?r[h]=o:o>s[h]&&(s[h]=o)}return e||(e=new g),e._set(r[0],r[1],s[0]-r[0],s[1]-r[1],i)},inverseTransform:function(){return this._inverseTransform(c.read(arguments))},_inverseTransform:function(t,e,i){var n=this._a,r=this._b,s=this._c,a=this._d,o=this._tx,h=this._ty,u=n*a-r*s,l=null;if(u&&!isNaN(u)&&isFinite(o)&&isFinite(h)){var f=t.x-this._tx,d=t.y-this._ty;e||(e=new c),l=e._set((f*a-d*s)/u,(d*n-f*r)/u,i)}return l},decompose:function(){var t,e,i,n=this._a,r=this._b,s=this._c,a=this._d,o=n*a-r*s,h=Math.sqrt,u=Math.atan2,l=180/Math.PI;if(0!==n||0!==r){var f=h(n*n+r*r);t=Math.acos(n/f)*(r>0?1:-1),e=[f,o/f],i=[u(n*s+r*a,f*f),0]}else if(0!==s||0!==a){var d=h(s*s+a*a);t=Math.asin(s/d)*(a>0?1:-1),e=[o/d,d],i=[0,u(n*s+r*a,d*d)]}else t=0,i=e=[0,0];return{translation:this.getTranslation(),rotation:t*l,scaling:new c(e),skewing:new c(i[0]*l,i[1]*l)}},getValues:function(){return[this._a,this._b,this._c,this._d,this._tx,this._ty]},getTranslation:function(){return new c(this._tx,this._ty)},getScaling:function(){return(this.decompose()||{}).scaling},getRotation:function(){return(this.decompose()||{}).rotation},applyToContext:function(t){this.isIdentity()||t.transform(this._a,this._b,this._c,this._d,this._tx,this._ty)}},r.each(["a","b","c","d","tx","ty"],function(t){var e=r.capitalize(t),i="_"+t;this["get"+e]=function(){return this[i]},this["set"+e]=function(t){this[i]=t,this._changed()}},{})),m=r.extend({_class:"Line",initialize:function(t,e,i,n,r){var s=!1;arguments.length>=4?(this._px=t,this._py=e,this._vx=i,this._vy=n,s=r):(this._px=t.x,this._py=t.y,this._vx=e.x,this._vy=e.y,s=i),s||(this._vx-=this._px,this._vy-=this._py)},getPoint:function(){return new c(this._px,this._py)},getVector:function(){return new c(this._vx,this._vy)},getLength:function(){return this.getVector().getLength()},intersect:function(t,e){return m.intersect(this._px,this._py,this._vx,this._vy,t._px,t._py,t._vx,t._vy,!0,e)},getSide:function(t,e){return m.getSide(this._px,this._py,this._vx,this._vy,t.x,t.y,!0,e)},getDistance:function(t){return Math.abs(this.getSignedDistance(t))},getSignedDistance:function(t){return m.getSignedDistance(this._px,this._py,this._vx,this._vy,t.x,t.y,!0)},isCollinear:function(t){return c.isCollinear(this._vx,this._vy,t._vx,t._vy)},isOrthogonal:function(t){return c.isOrthogonal(this._vx,this._vy,t._vx,t._vy)},statics:{intersect:function(t,e,i,n,r,s,a,o,h,l){h||(i-=t,n-=e,a-=r,o-=s);var f=i*o-n*a;if(!u.isZero(f)){var d=t-r,_=e-s,g=(a*_-o*d)/f,v=(i*_-n*d)/f;if(l||-1e-12<g&&g<1+1e-12&&-1e-12<v&&v<1+1e-12)return l||(g=g<=0?0:g>=1?1:g),new c(t+g*i,e+g*n)}},getSide:function(t,e,i,n,r,s,a,o){a||(i-=t,n-=e);var h=r-t,l=h*n-(s-e)*i;return!o&&u.isZero(l)&&(l=(h*i+h*i)/(i*i+n*n))>=0&&l<=1&&(l=0),l<0?-1:l>0?1:0},getSignedDistance:function(t,e,i,n,r,s,a){return a||(i-=t,n-=e),0===i?n>0?r-t:t-r:0===n?i<0?s-e:e-s:((r-t)*n-(s-e)*i)/Math.sqrt(i*i+n*n)},getDistance:function(t,e,i,n,r,s,a){return Math.abs(m.getSignedDistance(t,e,i,n,r,s,a))}}}),y=o.extend({_class:"Project",_list:"projects",_reference:"project",_compactSerialize:!0,initialize:function(t){o.call(this,!0),this._children=[],this._namedChildren={},this._activeLayer=null,this._currentStyle=new V(null,null,this),this._view=U.create(this,t||Q.getCanvas(1,1)),this._selectionItems={},this._selectionCount=0,this._updateVersion=0},_serialize:function(t,e){return r.serialize(this._children,t,!0,e)},_changed:function(t,e){if(1&t){var i=this._view;i&&(i._needsUpdate=!0,!i._requested&&i._autoUpdate&&i.requestUpdate())}var n=this._changes;if(n&&e){var r=this._changesById,s=e._id,a=r[s];a?a.flags|=t:n.push(r[s]={item:e,flags:t})}},clear:function(){for(var t=this._children,e=t.length-1;e>=0;e--)t[e].remove()},isEmpty:function(){return!this._children.length},remove:function t(){return!!t.base.call(this)&&(this._view&&this._view.remove(),!0)},getView:function(){return this._view},getCurrentStyle:function(){return this._currentStyle},setCurrentStyle:function(t){this._currentStyle.set(t)},getIndex:function(){return this._index},getOptions:function(){return this._scope.settings},getLayers:function(){return this._children},getActiveLayer:function(){return this._activeLayer||new b({project:this,insert:!0})},getSymbolDefinitions:function(){var t=[],e={};return this.getItems({class:P,match:function(i){var n=i._definition,r=n._id;return e[r]||(e[r]=!0,t.push(n)),!1}}),t},getSymbols:"getSymbolDefinitions",getSelectedItems:function(){var t=this._selectionItems,e=[];for(var i in t){var n=t[i],r=n._selection;1&r&&n.isInserted()?e.push(n):r||this._updateSelection(n)}return e},_updateSelection:function(t){var e=t._id,i=this._selectionItems;t._selection?i[e]!==t&&(this._selectionCount++,i[e]=t):i[e]===t&&(this._selectionCount--,delete i[e])},selectAll:function(){for(var t=this._children,e=0,i=t.length;e<i;e++)t[e].setFullySelected(!0)},deselectAll:function(){var t=this._selectionItems;for(var e in t)t[e].setFullySelected(!1)},addLayer:function(t){return this.insertLayer(e,t)},insertLayer:function(t,e){if(e instanceof b){e._remove(!1,!0),r.splice(this._children,[e],t,0),e._setProject(this,!0);var i=e._name;i&&e.setName(i),this._changes&&e._changed(5),this._activeLayer||(this._activeLayer=e)}else e=null;return e},_insertItem:function(t,i,n){return i=this.insertLayer(t,i)||(this._activeLayer||this._insertItem(e,new b(w.NO_INSERT),!0)).insertChild(t,i),n&&i.activate&&i.activate(),i},getItems:function(t){return w._getItems(this,t)},getItem:function(t){return w._getItems(this,t,null,null,!0)[0]||null},importJSON:function(t){this.activate();var e=this._activeLayer;return r.importJSON(t,e&&e.isEmpty()&&e)},removeOn:function(t){var e=this._removeSets;if(e){"mouseup"===t&&(e.mousedrag=null);var i=e[t];if(i){for(var n in i){var r=i[n];for(var s in e){var a=e[s];a&&a!=i&&delete a[r._id]}r.remove()}e[t]=null}}},draw:function(t,e,i){this._updateVersion++,t.save(),e.applyToContext(t);for(var n=this._children,s=new r({offset:new c(0,0),pixelRatio:i,viewMatrix:e.isIdentity()?null:e,matrices:[new p],updateMatrix:!0}),a=0,o=n.length;a<o;a++)n[a].draw(t,s);if(t.restore(),this._selectionCount>0){t.save(),t.strokeWidth=1;var h=this._selectionItems,u=this._scope.settings.handleSize,l=this._updateVersion;for(var f in h)h[f]._drawSelection(t,e,u,h,l);t.restore()}}}),w=r.extend(s,{statics:{extend:function t(e){return e._serializeFields&&(e._serializeFields=r.set({},this.prototype._serializeFields,e._serializeFields)),t.base.apply(this,arguments)},NO_INSERT:{insert:!1}},_class:"Item",_name:null,_applyMatrix:!0,_canApplyMatrix:!0,_canScaleStroke:!1,_pivot:null,_visible:!0,_blendMode:"normal",_opacity:1,_locked:!1,_guide:!1,_clipMask:!1,_selection:0,_selectBounds:!0,_selectChildren:!1,_serializeFields:{name:null,applyMatrix:null,matrix:new p,pivot:null,visible:!0,blendMode:"normal",opacity:1,locked:!1,guide:!1,clipMask:!1,selected:!1,data:{}},_prioritize:["applyMatrix"]},new function(){var t=["onMouseDown","onMouseUp","onMouseDrag","onClick","onDoubleClick","onMouseMove","onMouseEnter","onMouseLeave"];return r.each(t,function(t){this._events[t]={install:function(t){this.getView()._countItemEvent(t,1)},uninstall:function(t){this.getView()._countItemEvent(t,-1)}}},{_events:{onFrame:{install:function(){this.getView()._animateItem(this,!0)},uninstall:function(){this.getView()._animateItem(this,!1)}},onLoad:{},onError:{}},statics:{_itemHandlers:t}})},{initialize:function(){},_initialize:function(t,i){var n=t&&r.isPlainObject(t),s=n&&!0===t.internal,a=this._matrix=new p,o=n&&t.project||paper.project,h=paper.settings;return this._id=s?null:l.get(),this._parent=this._index=null,this._applyMatrix=this._canApplyMatrix&&h.applyMatrix,i&&a.translate(i),a._owner=this,this._style=new V(o._currentStyle,this,o),s||n&&0==t.insert||!h.insertItems&&(!n||!0!==t.insert)?this._setProject(o):(n&&t.parent||o)._insertItem(e,this,!0),n&&t!==w.NO_INSERT&&this.set(t,{internal:!0,insert:!0,project:!0,parent:!0}),n},_serialize:function(t,e){function i(i){for(var a in i){var o=s[a];r.equals(o,"leading"===a?1.2*i.fontSize:i[a])||(n[a]=r.serialize(o,t,"data"!==a,e))}}var n={},s=this;return i(this._serializeFields),this instanceof x||i(this._style._defaults),[this._class,n]},_changed:function(t){var i=this._symbol,n=this._parent||i,r=this._project;8&t&&(this._bounds=this._position=this._decomposed=this._globalMatrix=e),n&&40&t&&w._clearBoundsCache(n),2&t&&w._clearBoundsCache(this),r&&r._changed(t,this),i&&i._changed(t)},getId:function(){return this._id},getName:function(){return this._name},setName:function(t){if(this._name&&this._removeNamed(),t===+t+"")throw new Error("Names consisting only of numbers are not supported.");var i=this._getOwner();if(t&&i){var n=i._children,r=i._namedChildren;(r[t]=r[t]||[]).push(this),t in n||(n[t]=this)}this._name=t||e,this._changed(128)},getStyle:function(){return this._style},setStyle:function(t){this.getStyle().set(t)}},r.each(["locked","visible","blendMode","opacity","guide"],function(t){var e=r.capitalize(t),i="_"+t,n={locked:128,visible:137};this["get"+e]=function(){return this[i]},this["set"+e]=function(e){e!=this[i]&&(this[i]=e,this._changed(n[t]||129))}},{}),{beans:!0,getSelection:function(){return this._selection},setSelection:function(t){if(t!==this._selection){this._selection=t;var e=this._project;e&&(e._updateSelection(this),this._changed(129))}},_changeSelection:function(t,e){var i=this._selection;this.setSelection(e?i|t:i&~t)},isSelected:function(){if(this._selectChildren)for(var t=this._children,e=0,i=t.length;e<i;e++)if(t[e].isSelected())return!0;return!!(1&this._selection)},setSelected:function(t){if(this._selectChildren)for(var e=this._children,i=0,n=e.length;i<n;i++)e[i].setSelected(t);this._changeSelection(1,t)},isFullySelected:function(){var t=this._children,e=!!(1&this._selection);if(t&&e){for(var i=0,n=t.length;i<n;i++)if(!t[i].isFullySelected())return!1;return!0}return e},setFullySelected:function(t){var e=this._children;if(e)for(var i=0,n=e.length;i<n;i++)e[i].setFullySelected(t);this._changeSelection(1,t)},isClipMask:function(){return this._clipMask},setClipMask:function(t){this._clipMask!=(t=!!t)&&(this._clipMask=t,t&&(this.setFillColor(null),this.setStrokeColor(null)),this._changed(129),this._parent&&this._parent._changed(1024))},getData:function(){return this._data||(this._data={}),this._data},setData:function(t){this._data=t},getPosition:function(t){var e=this._position,i=t?c:f;if(!e){var n=this._pivot;e=this._position=n?this._matrix._transformPoint(n):this.getBounds().getCenter(!0)}return new i(e.x,e.y,this,"setPosition")},setPosition:function(){this.translate(c.read(arguments).subtract(this.getPosition(!0)))},getPivot:function(){var t=this._pivot;return t?new f(t.x,t.y,this,"setPivot"):null},setPivot:function(){this._pivot=c.read(arguments,0,{clone:!0,readNull:!0}),this._position=e}},r.each({getStrokeBounds:{stroke:!0},getHandleBounds:{handle:!0},getInternalBounds:{internal:!0}},function(t,e){this[e]=function(e){return this.getBounds(e,t)}},{beans:!0,getBounds:function(t,e){var i=e||t instanceof p,n=r.set({},i?e:t,this._boundsOptions);n.stroke&&!this.getStrokeScaling()||(n.cacheItem=this);var s=this._getCachedBounds(i&&t,n).rect;return arguments.length?s:new v(s.x,s.y,s.width,s.height,this,"setBounds")},setBounds:function(){var t=g.read(arguments),e=this.getBounds(),i=this._matrix,n=new p,r=t.getCenter();n.translate(r),t.width==e.width&&t.height==e.height||(i.isInvertible()||(i.set(i._backup||(new p).translate(i.getTranslation())),e=this.getBounds()),n.scale(0!==e.width?t.width/e.width:0,0!==e.height?t.height/e.height:0)),r=e.getCenter(),n.translate(-r.x,-r.y),this.transform(n)},_getBounds:function(t,e){var i=this._children;return i&&i.length?(w._updateBoundsCache(this,e.cacheItem),w._getBounds(i,t,e)):new g},_getBoundsCacheKey:function(t,e){return[t.stroke?1:0,t.handle?1:0,e?1:0].join("")},_getCachedBounds:function(t,e,i){t=t&&t._orNullIfIdentity();var n=e.internal&&!i,r=e.cacheItem,s=n?null:this._matrix._orNullIfIdentity(),a=r&&(!t||t.equals(s))&&this._getBoundsCacheKey(e,n),o=this._bounds;if(w._updateBoundsCache(this._parent||this._symbol,r),a&&o&&a in o)return{rect:(f=o[a]).rect.clone(),nonscaling:f.nonscaling};var h=this._getBounds(t||s,e),u=h.rect||h,l=this._style,c=h.nonscaling||l.hasStroke()&&!l.getStrokeScaling();if(a){o||(this._bounds=o={});var f=o[a]={rect:u.clone(),nonscaling:c,internal:n}}return{rect:u,nonscaling:c}},_getStrokeMatrix:function(t,e){var i=this.getStrokeScaling()?null:e&&e.internal?this:this._parent||this._symbol&&this._symbol._item,n=i?i.getViewMatrix().invert():t;return n&&n._shiftless()},statics:{_updateBoundsCache:function(t,e){if(t&&e){var i=e._id,n=t._boundsCache=t._boundsCache||{ids:{},list:[]};n.ids[i]||(n.list.push(e),n.ids[i]=e)}},_clearBoundsCache:function(t){var i=t._boundsCache;if(i){t._bounds=t._position=t._boundsCache=e;for(var n=0,r=i.list,s=r.length;n<s;n++){var a=r[n];a!==t&&(a._bounds=a._position=e,a._boundsCache&&w._clearBoundsCache(a))}}},_getBounds:function(t,e,i){var n=1/0,r=-n,s=n,a=r,o=!1;i=i||{};for(var h=0,u=t.length;h<u;h++){var l=t[h];if(l._visible&&!l.isEmpty()){var c=l._getCachedBounds(e&&e.appended(l._matrix),i,!0),f=c.rect;n=Math.min(f.x,n),s=Math.min(f.y,s),r=Math.max(f.x+f.width,r),a=Math.max(f.y+f.height,a),c.nonscaling&&(o=!0)}}return{rect:isFinite(n)?new g(n,s,r-n,a-s):new g,nonscaling:o}}}}),{beans:!0,_decompose:function(){return this._applyMatrix?null:this._decomposed||(this._decomposed=this._matrix.decompose())},getRotation:function(){var t=this._decompose();return t?t.rotation:0},setRotation:function(t){var e=this.getRotation();if(null!=e&&null!=t){var i=this._decomposed;this.rotate(t-e),i&&(i.rotation=t,this._decomposed=i)}},getScaling:function(){var t=this._decompose(),e=t&&t.scaling;return new f(e?e.x:1,e?e.y:1,this,"setScaling")},setScaling:function(){var t=this.getScaling(),e=c.read(arguments,0,{clone:!0,readNull:!0});if(t&&e&&!t.equals(e)){var i=this.getRotation(),n=this._decomposed,r=new p,s=this.getPosition(!0);r.translate(s),i&&r.rotate(i),r.scale(e.x/t.x,e.y/t.y),i&&r.rotate(-i),r.translate(s.negate()),this.transform(r),n&&(n.scaling=e,this._decomposed=n)}},getMatrix:function(){return this._matrix},setMatrix:function(){var t=this._matrix;t.initialize.apply(t,arguments)},getGlobalMatrix:function(t){var e=this._globalMatrix,i=this._project._updateVersion;if(e&&e._updateVersion!==i&&(e=null),!e){e=this._globalMatrix=this._matrix.clone();var n=this._parent;n&&e.prepend(n.getGlobalMatrix(!0)),e._updateVersion=i}return t?e:e.clone()},getViewMatrix:function(){return this.getGlobalMatrix().prepend(this.getView()._matrix)},getApplyMatrix:function(){return this._applyMatrix},setApplyMatrix:function(t){(this._applyMatrix=this._canApplyMatrix&&!!t)&&this.transform(null,!0)},getTransformContent:"#getApplyMatrix",setTransformContent:"#setApplyMatrix"},{getProject:function(){return this._project},_setProject:function(t,e){if(this._project!==t){this._project&&this._installEvents(!1),this._project=t;for(var i=this._children,n=0,r=i&&i.length;n<r;n++)i[n]._setProject(t);e=!0}e&&this._installEvents(!0)},getView:function(){return this._project._view},_installEvents:function t(e){t.base.call(this,e);for(var i=this._children,n=0,r=i&&i.length;n<r;n++)i[n]._installEvents(e)},getLayer:function(){for(var t=this;t=t._parent;)if(t instanceof b)return t;return null},getParent:function(){return this._parent},setParent:function(t){return t.addChild(this)},_getOwner:"#getParent",getChildren:function(){return this._children},setChildren:function(t){this.removeChildren(),this.addChildren(t)},getFirstChild:function(){return this._children&&this._children[0]||null},getLastChild:function(){return this._children&&this._children[this._children.length-1]||null},getNextSibling:function(){var t=this._getOwner();return t&&t._children[this._index+1]||null},getPreviousSibling:function(){var t=this._getOwner();return t&&t._children[this._index-1]||null},getIndex:function(){return this._index},equals:function(t){return t===this||t&&this._class===t._class&&this._style.equals(t._style)&&this._matrix.equals(t._matrix)&&this._locked===t._locked&&this._visible===t._visible&&this._blendMode===t._blendMode&&this._opacity===t._opacity&&this._clipMask===t._clipMask&&this._guide===t._guide&&this._equals(t)||!1},_equals:function(t){return r.equals(this._children,t._children)},clone:function(t){var i=new this.constructor(w.NO_INSERT),n=this._children,s=r.pick(t?t.insert:e,t===e||!0===t),a=r.pick(t?t.deep:e,!0);n&&i.copyAttributes(this),n&&!a||i.copyContent(this),n||i.copyAttributes(this),s&&i.insertAbove(this);var o=this._name,h=this._parent;if(o&&h){for(var n=h._children,u=o,l=1;n[o];)o=u+" "+l++;o!==u&&i.setName(o)}return i},copyContent:function(t){for(var e=t._children,i=0,n=e&&e.length;i<n;i++)this.addChild(e[i].clone(!1),!0)},copyAttributes:function(t,e){this.setStyle(t._style);for(var i=["_locked","_visible","_blendMode","_opacity","_clipMask","_guide"],n=0,s=i.length;n<s;n++){var a=i[n];t.hasOwnProperty(a)&&(this[a]=t[a])}e||this._matrix.set(t._matrix,!0),this.setApplyMatrix(t._applyMatrix),this.setPivot(t._pivot),this.setSelection(t._selection);var o=t._data,h=t._name;this._data=o?r.clone(o):null,h&&this.setName(h)},rasterize:function(t,i){var n=this.getStrokeBounds(),s=(t||this.getView().getResolution())/72,a=n.getTopLeft().floor(),o=n.getBottomRight().ceil(),h=new d(o.subtract(a)),u=new S(w.NO_INSERT);if(!h.isZero()){var l=Q.getCanvas(h.multiply(s)),c=l.getContext("2d"),f=(new p).scale(s).translate(a.negate());c.save(),f.applyToContext(c),this.draw(c,new r({matrices:[f]})),c.restore(),u.setCanvas(l)}return u.transform((new p).translate(a.add(h.divide(2))).scale(1/s)),(i===e||i)&&u.insertAbove(this),u},contains:function(){return!!this._contains(this._matrix._inverseTransform(c.read(arguments)))},_contains:function(t){var e=this._children;if(e){for(var i=e.length-1;i>=0;i--)if(e[i].contains(t))return!0;return!1}return t.isInside(this.getInternalBounds())},isInside:function(){return g.read(arguments).contains(this.getBounds())},_asPathItem:function(){return new L.Rectangle({rectangle:this.getInternalBounds(),matrix:this._matrix,insert:!1})},intersects:function(t,e){return t instanceof w&&this._asPathItem().getIntersections(t._asPathItem(),null,e,!0).length>0}},new function(){function t(){return this._hitTest(c.read(arguments),M.getOptions(arguments))}function e(){var t=c.read(arguments),e=M.getOptions(arguments),i=[];return this._hitTest(t,r.set({all:i},e)),i}function i(t,e,i,n){var r=this._children;if(r)for(var s=r.length-1;s>=0;s--){var a=r[s],o=a!==n&&a._hitTest(t,e,i);if(o&&!e.all)return o}return null}return y.inject({hitTest:t,hitTestAll:e,_hitTest:i}),{hitTest:t,hitTestAll:e,_hitTestChildren:i}},{_hitTest:function(t,e,i){function n(t){return t&&_&&!_(t)&&(t=null),t&&e.all&&e.all.push(t),t}function s(e,i){var n=i?l["get"+i]():g.getPosition();if(t.subtract(n).divide(u).length<=1)return new M(e,g,{name:i?r.hyphenate(i):e,point:n})}if(this._locked||!this._visible||this._guide&&!e.guides||this.isEmpty())return null;var a=this._matrix,o=i?i.appended(a):this.getGlobalMatrix().prepend(this.getView()._matrix),h=Math.max(e.tolerance,1e-12),u=e._tolerancePadding=new d(L._getStrokePadding(h,a._shiftless().invert()));if(!(t=a._inverseTransform(t))||!this._children&&!this.getBounds({internal:!0,stroke:!0,handle:!0}).expand(u.multiply(2))._containsPoint(t))return null;var l,c,f=!(e.guides&&!this._guide||e.selected&&!this.isSelected()||e.type&&e.type!==r.hyphenate(this._class)||e.class&&!(this instanceof e.class)),_=e.match,g=this,v=e.position,p=e.center,m=e.bounds;if(f&&this._parent&&(v||p||m)){if((p||m)&&(l=this.getInternalBounds()),!(c=v&&s("position")||p&&s("center","Center"))&&m)for(var y=["TopLeft","TopRight","BottomLeft","BottomRight","LeftCenter","TopCenter","RightCenter","BottomCenter"],w=0;w<8&&!c;w++)c=s("bounds",y[w]);c=n(c)}return c||(c=this._hitTestChildren(t,e,o)||f&&n(this._hitTestSelf(t,e,o,this.getStrokeScaling()?null:o._shiftless().invert()))||null),c&&c.point&&(c.point=a.transform(c.point)),c},_hitTestSelf:function(t,e){if(e.fill&&this.hasFill()&&this._contains(t))return new M("fill",this)},matches:function(t,e){function i(t,e){for(var n in t)if(t.hasOwnProperty(n)){var s=t[n],a=e[n];if(r.isPlainObject(s)&&r.isPlainObject(a)){if(!i(s,a))return!1}else if(!r.equals(s,a))return!1}return!0}var n=typeof t;if("object"===n){for(var s in t)if(t.hasOwnProperty(s)&&!this.matches(s,t[s]))return!1;return!0}if("function"===n)return t(this);if("match"===t)return e(this);var a=/^(empty|editable)$/.test(t)?this["is"+r.capitalize(t)]():"type"===t?r.hyphenate(this._class):this[t];if("class"===t){if("function"==typeof e)return this instanceof e;a=this._class}if("function"==typeof e)return!!e(a);if(e){if(e.test)return e.test(a);if(r.isPlainObject(e))return i(e,a)}return r.equals(a,e)},getItems:function(t){return w._getItems(this,t,this._matrix)},getItem:function(t){return w._getItems(this,t,this._matrix,null,!0)[0]||null},statics:{_getItems:function t(e,i,n,s,a){if(!s){var o="object"==typeof i&&i,h=o&&o.overlapping,u=o&&o.inside,l=(w=h||u)&&g.read([w]);s={items:[],recursive:o&&!1!==o.recursive,inside:!!u,overlapping:!!h,rect:l,path:h&&new L.Rectangle({rectangle:l,insert:!1})},o&&(i=r.filter({},i,{recursive:!0,inside:!0,overlapping:!0}))}var c=e._children,f=s.items;n=(l=s.rect)&&(n||new p);for(var d=0,_=c&&c.length;d<_;d++){var v=c[d],m=n&&n.appended(v._matrix),y=!0;if(l){var w=v.getBounds(m);if(!l.intersects(w))continue;l.contains(w)||s.overlapping&&(w.contains(l)||s.path.intersects(v,m))||(y=!1)}if(y&&v.matches(i)&&(f.push(v),a))break;if(!1!==s.recursive&&t(v,i,m,s,a),a&&f.length>0)break}return f}}},{importJSON:function(t){var e=r.importJSON(t,this);return e!==this?this.addChild(e):e},addChild:function(t){return this.insertChild(e,t)},insertChild:function(t,e){var i=e?this.insertChildren(t,[e]):null;return i&&i[0]},addChildren:function(t){return this.insertChildren(this._children.length,t)},insertChildren:function(t,e){var i=this._children;if(i&&e&&e.length>0){for(var n={},s=(e=r.slice(e)).length-1;s>=0;s--){var a=(l=e[s])&&l._id;!l||n[a]?e.splice(s,1):(l._remove(!1,!0),n[a]=!0)}r.splice(i,e,t,0);for(var o=this._project,h=o._changes,s=0,u=e.length;s<u;s++){var l=e[s],c=l._name;l._parent=this,l._setProject(o,!0),c&&l.setName(c),h&&l._changed(5)}this._changed(11)}else e=null;return e},_insertItem:"#insertChild",_insertAt:function(t,e){var i=t&&t._getOwner(),n=t!==this&&i?this:null;return n&&(n._remove(!1,!0),i._insertItem(t._index+e,n)),n},insertAbove:function(t){return this._insertAt(t,1)},insertBelow:function(t){return this._insertAt(t,0)},sendToBack:function(){var t=this._getOwner();return t?t._insertItem(0,this):null},bringToFront:function(){var t=this._getOwner();return t?t._insertItem(e,this):null},appendTop:"#addChild",appendBottom:function(t){return this.insertChild(0,t)},moveAbove:"#insertAbove",moveBelow:"#insertBelow",addTo:function(t){return t._insertItem(e,this)},copyTo:function(t){return this.clone(!1).addTo(t)},reduce:function(t){var e=this._children;if(e&&1===e.length){var i=e[0].reduce(t);return this._parent?(i.insertAbove(this),this.remove()):i.remove(),i}return this},_removeNamed:function(){var t=this._getOwner();if(t){var e=t._children,i=t._namedChildren,n=this._name,r=i[n],s=r?r.indexOf(this):-1;-1!==s&&(e[n]==this&&delete e[n],r.splice(s,1),r.length?e[n]=r[0]:delete i[n])}},_remove:function(t,e){var i=this._getOwner(),n=this._project,s=this._index;return!!i&&(this._name&&this._removeNamed(),null!=s&&(n._activeLayer===this&&(n._activeLayer=this.getNextSibling()||this.getPreviousSibling()),r.splice(i._children,null,s,1)),this._installEvents(!1),t&&n._changes&&this._changed(5),e&&i._changed(11,this),this._parent=null,!0)},remove:function(){return this._remove(!0,!0)},replaceWith:function(t){var e=t&&t.insertBelow(this);return e&&this.remove(),e},removeChildren:function(t,e){if(!this._children)return null;t=t||0,e=r.pick(e,this._children.length);for(var i=r.splice(this._children,null,t,e-t),n=i.length-1;n>=0;n--)i[n]._remove(!0,!1);return i.length>0&&this._changed(11),i},clear:"#removeChildren",reverseChildren:function(){if(this._children){this._children.reverse();for(var t=0,e=this._children.length;t<e;t++)this._children[t]._index=t;this._changed(11)}},isEmpty:function(){var t=this._children;return!t||!t.length},isEditable:function(){for(var t=this;t;){if(!t._visible||t._locked)return!1;t=t._parent}return!0},hasFill:function(){return this.getStyle().hasFill()},hasStroke:function(){return this.getStyle().hasStroke()},hasShadow:function(){return this.getStyle().hasShadow()},_getOrder:function(t){function e(t){var e=[];do{e.unshift(t)}while(t=t._parent);return e}for(var i=e(this),n=e(t),r=0,s=Math.min(i.length,n.length);r<s;r++)if(i[r]!=n[r])return i[r]._index<n[r]._index?1:-1;return 0},hasChildren:function(){return this._children&&this._children.length>0},isInserted:function(){return!!this._parent&&this._parent.isInserted()},isAbove:function(t){return-1===this._getOrder(t)},isBelow:function(t){return 1===this._getOrder(t)},isParent:function(t){return this._parent===t},isChild:function(t){return t&&t._parent===this},isDescendant:function(t){for(var e=this;e=e._parent;)if(e===t)return!0;return!1},isAncestor:function(t){return!!t&&t.isDescendant(this)},isSibling:function(t){return this._parent===t._parent},isGroupedWith:function(t){for(var e=this._parent;e;){if(e._parent&&/^(Group|Layer|CompoundPath)$/.test(e._class)&&t.isDescendant(e))return!0;e=e._parent}return!1}},r.each(["rotate","scale","shear","skew"],function(t){var e="rotate"===t;this[t]=function(){var i=(e?r:c).read(arguments),n=c.read(arguments,0,{readNull:!0});return this.transform((new p)[t](i,n||this.getPosition(!0)))}},{translate:function(){var t=new p;return this.transform(t.translate.apply(t,arguments))},transform:function(t,e,i,n){var r=this._matrix,s=t&&!t.isIdentity(),a=(e||this._applyMatrix)&&(!r.isIdentity()||s||e&&i&&this._children);if(!s&&!a)return this;if(s){!t.isInvertible()&&r.isInvertible()&&(r._backup=r.getValues()),r.prepend(t,!0);var o=this._style,h=o.getFillColor(!0),u=o.getStrokeColor(!0);h&&h.transform(t),u&&u.transform(t)}if(a&&(a=this._transformContent(r,i,n))){var l=this._pivot;l&&r._transformPoint(l,l,!0),r.reset(!0),n&&this._canApplyMatrix&&(this._applyMatrix=!0)}var c=this._bounds,f=this._position;(s||a)&&this._changed(9);var d=s&&c&&t.decompose();if(d&&d.skewing.isZero()&&d.rotation%90==0){for(var _ in c){var g=c[_];if(g.nonscaling)delete c[_];else if(a||!g.internal){var v=g.rect;t._transformBounds(v,v)}}this._bounds=c;var p=c[this._getBoundsCacheKey(this._boundsOptions||{})];p&&(this._position=p.rect.getCenter(!0))}else s&&f&&this._pivot&&(this._position=t._transformPoint(f,f));return this},_transformContent:function(t,e,i){var n=this._children;if(n){for(var r=0,s=n.length;r<s;r++)n[r].transform(t,!0,e,i);return!0}},globalToLocal:function(){return this.getGlobalMatrix(!0)._inverseTransform(c.read(arguments))},localToGlobal:function(){return this.getGlobalMatrix(!0)._transformPoint(c.read(arguments))},parentToLocal:function(){return this._matrix._inverseTransform(c.read(arguments))},localToParent:function(){return this._matrix._transformPoint(c.read(arguments))},fitBounds:function(t,e){t=g.read(arguments);var i=this.getBounds(),n=i.height/i.width,r=t.height/t.width,s=(e?n>r:n<r)?t.width/i.width:t.height/i.height,a=new g(new c,new d(i.width*s,i.height*s));a.setCenter(t.getCenter()),this.setBounds(a)}}),{_setStyles:function(t,e,i){var n=this._style,r=this._matrix;if(n.hasFill()&&(t.fillStyle=n.getFillColor().toCanvasStyle(t,r)),n.hasStroke()){t.strokeStyle=n.getStrokeColor().toCanvasStyle(t,r),t.lineWidth=n.getStrokeWidth();var s=n.getStrokeJoin(),a=n.getStrokeCap(),o=n.getMiterLimit();if(s&&(t.lineJoin=s),a&&(t.lineCap=a),o&&(t.miterLimit=o),paper.support.nativeDash){var h=n.getDashArray(),u=n.getDashOffset();h&&h.length&&("setLineDash"in t?(t.setLineDash(h),t.lineDashOffset=u):(t.mozDash=h,t.mozDashOffset=u))}}if(n.hasShadow()){var l=e.pixelRatio||1,f=i._shiftless().prepend((new p).scale(l,l)),d=f.transform(new c(n.getShadowBlur(),0)),_=f.transform(this.getShadowOffset());t.shadowColor=n.getShadowColor().toCanvasStyle(t),t.shadowBlur=d.getLength(),t.shadowOffsetX=_.x,t.shadowOffsetY=_.y}},draw:function(t,e,i){var n=this._updateVersion=this._project._updateVersion;if(this._visible&&0!==this._opacity){var r=e.matrices,s=e.viewMatrix,a=this._matrix,o=r[r.length-1].appended(a);if(o.isInvertible()){s=s?s.appended(o):o,r.push(o),e.updateMatrix&&(o._updateVersion=n,this._globalMatrix=o);var h,u,l,c=this._blendMode,f=this._opacity,d="normal"===c,_=tt.nativeModes[c],g=d&&1===f||e.dontStart||e.clip||(_||d&&f<1)&&this._canComposite(),v=e.pixelRatio||1;if(!g){var p=this.getStrokeBounds(s);if(!p.width||!p.height)return;l=e.offset,u=e.offset=p.getTopLeft().floor(),h=t,t=Q.getContext(p.getSize().ceil().add(1).multiply(v)),1!==v&&t.scale(v,v)}t.save();var m=i?i.appended(a):this._canScaleStroke&&!this.getStrokeScaling(!0)&&s,y=!g&&e.clipItem,w=!m||y;if(g?(t.globalAlpha=f,_&&(t.globalCompositeOperation=c)):w&&t.translate(-u.x,-u.y),w&&(g?a:s).applyToContext(t),y&&e.clipItem.draw(t,e.extend({clip:!0})),m){t.setTransform(v,0,0,v,0,0);var x=e.offset;x&&t.translate(-x.x,-x.y)}this._draw(t,e,s,m),t.restore(),r.pop(),e.clip&&!e.dontFinish&&t.clip(),g||(tt.process(c,t,h,f,u.subtract(l).multiply(v)),Q.release(t),e.offset=l)}}},_isUpdated:function(t){var e=this._parent;if(e instanceof N)return e._isUpdated(t);var i=this._updateVersion===t;return!i&&e&&e._visible&&e._isUpdated(t)&&(this._updateVersion=t,i=!0),i},_drawSelection:function(t,e,i,n,r){var s=this._selection,a=1&s,o=2&s||a&&this._selectBounds,h=4&s;if(this._drawSelected||(a=!1),(a||o||h)&&this._isUpdated(r)){var u,l=this.getSelectedColor(!0)||(u=this.getLayer())&&u.getSelectedColor(!0),c=e.appended(this.getGlobalMatrix(!0)),f=i/2;if(t.strokeStyle=t.fillStyle=l?l.toCanvasStyle(t):"#009dec",a&&this._drawSelected(t,c,n),h){var d=this.getPosition(!0),_=d.x,g=d.y;t.beginPath(),t.arc(_,g,f,0,2*Math.PI,!0),t.stroke();for(var v=[[0,-1],[1,0],[0,1],[-1,0]],p=f,m=i+1,y=0;y<4;y++){var w=v[y],x=w[0],b=w[1];t.moveTo(_+x*p,g+b*p),t.lineTo(_+x*m,g+b*m),t.stroke()}}if(o){var C=c._transformCorners(this.getInternalBounds());t.beginPath();for(y=0;y<8;y++)t[y?"lineTo":"moveTo"](C[y],C[++y]);t.closePath(),t.stroke();for(y=0;y<8;y++)t.fillRect(C[y]-f,C[++y]-f,i,i)}}},_canComposite:function(){return!1}},r.each(["down","drag","up","move"],function(t){this["removeOn"+r.capitalize(t)]=function(){var e={};return e[t]=!0,this.removeOn(e)}},{removeOn:function(t){for(var e in t)if(t[e]){var i="mouse"+e,n=this._project,r=n._removeSets=n._removeSets||{};r[i]=r[i]||{},r[i][this._id]=this}return this}})),x=w.extend({_class:"Group",_selectBounds:!1,_selectChildren:!0,_serializeFields:{children:[]},initialize:function(t){this._children=[],this._namedChildren={},this._initialize(t)||this.addChildren(Array.isArray(t)?t:arguments)},_changed:function t(i){t.base.call(this,i),1026&i&&(this._clipItem=e)},_getClipItem:function(){var t=this._clipItem;if(t===e){t=null;for(var i=this._children,n=0,r=i.length;n<r;n++)if(i[n]._clipMask){t=i[n];break}this._clipItem=t}return t},isClipped:function(){return!!this._getClipItem()},setClipped:function(t){var e=this.getFirstChild();e&&e.setClipMask(t)},_getBounds:function t(e,i){var n=this._getClipItem();return n?n._getCachedBounds(e&&e.appended(n._matrix),r.set({},i,{stroke:!1})):t.base.call(this,e,i)},_hitTestChildren:function t(e,i,n){var r=this._getClipItem();return(!r||r.contains(e))&&t.base.call(this,e,i,n,r)},_draw:function(t,e){var i=e.clip,n=!i&&this._getClipItem();e=e.extend({clipItem:n,clip:!1}),i?(t.beginPath(),e.dontStart=e.dontFinish=!0):n&&n.draw(t,e.extend({clip:!0}));for(var r=this._children,s=0,a=r.length;s<a;s++){var o=r[s];o!==n&&o.draw(t,e)}}}),b=x.extend({_class:"Layer",initialize:function(){x.apply(this,arguments)},_getOwner:function(){return this._parent||null!=this._index&&this._project},isInserted:function t(){return this._parent?t.base.call(this):null!=this._index},activate:function(){this._project._activeLayer=this},_hitTestSelf:function(){}}),C=w.extend({_class:"Shape",_applyMatrix:!1,_canApplyMatrix:!1,_canScaleStroke:!0,_serializeFields:{type:null,size:null,radius:null},initialize:function(t,e){this._initialize(t,e)},_equals:function(t){return this._type===t._type&&this._size.equals(t._size)&&r.equals(this._radius,t._radius)},copyContent:function(t){this.setType(t._type),this.setSize(t._size),this.setRadius(t._radius)},getType:function(){return this._type},setType:function(t){this._type=t},getShape:"#getType",setShape:"#setType",getSize:function(){var t=this._size;return new _(t.width,t.height,this,"setSize")},setSize:function(){var t=d.read(arguments);if(this._size){if(!this._size.equals(t)){var e=this._type,i=t.width,n=t.height;"rectangle"===e?this._radius.set(d.min(this._radius,t.divide(2))):"circle"===e?(i=n=(i+n)/2,this._radius=i/2):"ellipse"===e&&this._radius._set(i/2,n/2),this._size._set(i,n),this._changed(9)}}else this._size=t.clone()},getRadius:function(){var t=this._radius;return"circle"===this._type?t:new _(t.width,t.height,this,"setRadius")},setRadius:function(t){var e=this._type;if("circle"===e){if(t===this._radius)return;i=2*t;this._radius=t,this._size._set(i,i)}else if(t=d.read(arguments),this._radius){if(this._radius.equals(t))return;if(this._radius.set(t),"rectangle"===e){var i=d.max(this._size,t.multiply(2));this._size.set(i)}else"ellipse"===e&&this._size._set(2*t.width,2*t.height)}else this._radius=t.clone();this._changed(9)},isEmpty:function(){return!1},toPath:function(t){var i=new(L[r.capitalize(this._type)])({center:new c,size:this._size,radius:this._radius,insert:!1});return i.copyAttributes(this),paper.settings.applyMatrix&&i.setApplyMatrix(!0),(t===e||t)&&i.insertAbove(this),i},toShape:"#clone",_asPathItem:function(){return this.toPath(!1)},_draw:function(t,e,i,n){var r=this._style,s=r.hasFill(),a=r.hasStroke(),o=e.dontFinish||e.clip,h=!n;if(s||a||o){var u=this._type,l=this._radius,c="circle"===u;if(e.dontStart||t.beginPath(),h&&c)t.arc(0,0,l,0,2*Math.PI,!0);else{var f=c?l:l.width,d=c?l:l.height,_=this._size,g=_.width,v=_.height;if(h&&"rectangle"===u&&0===f&&0===d)t.rect(-g/2,-v/2,g,v);else{var p=g/2,m=v/2,y=.44771525016920644,w=f*y,x=d*y,b=[-p,-m+d,-p,-m+x,-p+w,-m,-p+f,-m,p-f,-m,p-w,-m,p,-m+x,p,-m+d,p,m-d,p,m-x,p-w,m,p-f,m,-p+f,m,-p+w,m,-p,m-x,-p,m-d];n&&n.transform(b,b,32),t.moveTo(b[0],b[1]),t.bezierCurveTo(b[2],b[3],b[4],b[5],b[6],b[7]),p!==f&&t.lineTo(b[8],b[9]),t.bezierCurveTo(b[10],b[11],b[12],b[13],b[14],b[15]),m!==d&&t.lineTo(b[16],b[17]),t.bezierCurveTo(b[18],b[19],b[20],b[21],b[22],b[23]),p!==f&&t.lineTo(b[24],b[25]),t.bezierCurveTo(b[26],b[27],b[28],b[29],b[30],b[31])}}t.closePath()}o||!s&&!a||(this._setStyles(t,e,i),s&&(t.fill(r.getFillRule()),t.shadowColor="rgba(0,0,0,0)"),a&&t.stroke())},_canComposite:function(){return!(this.hasFill()&&this.hasStroke())},_getBounds:function(t,e){var i=new g(this._size).setCenter(0,0),n=this._style,r=e.stroke&&n.hasStroke()&&n.getStrokeWidth();return t&&(i=t._transformBounds(i)),r?i.expand(L._getStrokePadding(r,this._getStrokeMatrix(t,e))):i}},new function(){function t(t,e,i){var n=t._radius;if(!n.isZero())for(var r=t._size.divide(2),s=1;s<=4;s++){var a=new c(s>1&&s<4?-1:1,s>2?-1:1),o=a.multiply(r),h=o.subtract(a.multiply(n));if(new g(i?o.add(a.multiply(i)):o,h).contains(e))return{point:h,quadrant:s}}}function e(t,e,i,n){var r=t.divide(e);return(!n||r.isInQuadrant(n))&&r.subtract(r.normalize()).multiply(e).divide(i).length<=1}return{_contains:function e(i){if("rectangle"===this._type){var n=t(this,i);return n?i.subtract(n.point).divide(this._radius).getLength()<=1:e.base.call(this,i)}return i.divide(this.size).getLength()<=.5},_hitTestSelf:function i(n,r,s,a){var o=!1,h=this._style,u=r.stroke&&h.hasStroke(),l=r.fill&&h.hasFill();if(u||l){var c=this._type,f=this._radius,d=u?h.getStrokeWidth()/2:0,_=r._tolerancePadding.add(L._getStrokePadding(d,!h.getStrokeScaling()&&a));if("rectangle"===c){var v=_.multiply(2),p=t(this,n,v);if(p)o=e(n.subtract(p.point),f,_,p.quadrant);else{var m=new g(this._size).setCenter(0,0),y=m.expand(v),w=m.expand(v.negate());o=y._containsPoint(n)&&!w._containsPoint(n)}}else o=e(n,f,_)}return o?new M(u?"stroke":"fill",this):i.base.apply(this,arguments)}}},{statics:new function(){function t(t,e,i,n,s){var a=new C(r.getNamed(s),e);return a._type=t,a._size=i,a._radius=n,a}return{Circle:function(){var e=c.readNamed(arguments,"center"),i=r.readNamed(arguments,"radius");return t("circle",e,new d(2*i),i,arguments)},Rectangle:function(){var e=g.readNamed(arguments,"rectangle"),i=d.min(d.readNamed(arguments,"radius"),e.getSize(!0).divide(2));return t("rectangle",e.getCenter(!0),e.getSize(!0),i,arguments)},Ellipse:function(){var e=C._readEllipse(arguments),i=e.radius;return t("ellipse",e.center,i.multiply(2),i,arguments)},_readEllipse:function(t){var e,i;if(r.hasNamed(t,"radius"))e=c.readNamed(t,"center"),i=d.readNamed(t,"radius");else{var n=g.readNamed(t,"rectangle");e=n.getCenter(!0),i=n.getSize(!0).divide(2)}return{center:e,radius:i}}}}}),S=w.extend({_class:"Raster",_applyMatrix:!1,_canApplyMatrix:!1,_boundsOptions:{stroke:!1,handle:!1},_serializeFields:{crossOrigin:null,source:null},_prioritize:["crossOrigin"],initialize:function(t,i){if(!this._initialize(t,i!==e&&c.read(arguments,1))){var r="string"==typeof t?n.getElementById(t):t;r?this.setImage(r):this.setSource(t)}this._size||(this._size=new d,this._loaded=!1)},_equals:function(t){return this.getSource()===t.getSource()},copyContent:function(t){var e=t._image,i=t._canvas;if(e)this._setImage(e);else if(i){var n=Q.getCanvas(t._size);n.getContext("2d").drawImage(i,0,0),this._setImage(n)}this._crossOrigin=t._crossOrigin},getSize:function(){var t=this._size;return new _(t?t.width:0,t?t.height:0,this,"setSize")},setSize:function(){var t=d.read(arguments);if(!t.equals(this._size))if(t.width>0&&t.height>0){var e=this.getElement();this._setImage(Q.getCanvas(t)),e&&this.getContext(!0).drawImage(e,0,0,t.width,t.height)}else this._canvas&&Q.release(this._canvas),this._size=t.clone()},getWidth:function(){return this._size?this._size.width:0},setWidth:function(t){this.setSize(t,this.getHeight())},getHeight:function(){return this._size?this._size.height:0},setHeight:function(t){this.setSize(this.getWidth(),t)},getLoaded:function(){return this._loaded},isEmpty:function(){var t=this._size;return!t||0===t.width&&0===t.height},getResolution:function(){var t=this._matrix,e=new c(0,0).transform(t),i=new c(1,0).transform(t).subtract(e),n=new c(0,1).transform(t).subtract(e);return new d(72/i.getLength(),72/n.getLength())},getPpi:"#getResolution",getImage:function(){return this._image},setImage:function(t){function e(t){var e=i.getView(),n=t&&t.type||"load";e&&i.responds(n)&&(paper=e._scope,i.emit(n,new G(t)))}var i=this;this._setImage(t),this._loaded?setTimeout(e,0):t&&Z.add(t,{load:function(n){i._setImage(t),e(n)},error:e})},_setImage:function(t){this._canvas&&Q.release(this._canvas),t&&t.getContext?(this._image=null,this._canvas=t,this._loaded=!0):(this._image=t,this._canvas=null,this._loaded=!!(t&&t.src&&t.complete)),this._size=new d(t?t.naturalWidth||t.width:0,t?t.naturalHeight||t.height:0),this._context=null,this._changed(521)},getCanvas:function(){if(!this._canvas){var t=Q.getContext(this._size);try{this._image&&t.drawImage(this._image,0,0),this._canvas=t.canvas}catch(e){Q.release(t)}}return this._canvas},setCanvas:"#setImage",getContext:function(t){return this._context||(this._context=this.getCanvas().getContext("2d")),t&&(this._image=null,this._changed(513)),this._context},setContext:function(t){this._context=t},getSource:function(){var t=this._image;return t&&t.src||this.toDataURL()},setSource:function(e){var i=new t.Image,n=this._crossOrigin;n&&(i.crossOrigin=n),i.src=e,this.setImage(i)},getCrossOrigin:function(){var t=this._image;return t&&t.crossOrigin||this._crossOrigin||""},setCrossOrigin:function(t){this._crossOrigin=t;var e=this._image;e&&(e.crossOrigin=t)},getElement:function(){return this._canvas||this._loaded&&this._image}},{beans:!1,getSubCanvas:function(){var t=g.read(arguments),e=Q.getContext(t.getSize());return e.drawImage(this.getCanvas(),t.x,t.y,t.width,t.height,0,0,t.width,t.height),e.canvas},getSubRaster:function(){var t=g.read(arguments),e=new S(w.NO_INSERT);return e._setImage(this.getSubCanvas(t)),e.translate(t.getCenter().subtract(this.getSize().divide(2))),e._matrix.prepend(this._matrix),e.insertAbove(this),e},toDataURL:function(){var t=this._image,e=t&&t.src;if(/^data:/.test(e))return e;var i=this.getCanvas();return i?i.toDataURL.apply(i,arguments):null},drawImage:function(t){var e=c.read(arguments,1);this.getContext(!0).drawImage(t,e.x,e.y)},getAverageColor:function(t){var e,i;if(t?t instanceof A?(i=t,e=t.getBounds()):"object"==typeof t&&("width"in t?e=new g(t):"x"in t&&(e=new g(t.x-.5,t.y-.5,1,1))):e=this.getBounds(),!e)return null;var n=Math.min(e.width,32),s=Math.min(e.height,32),a=S._sampleContext;a?a.clearRect(0,0,33,33):a=S._sampleContext=Q.getContext(new d(32)),a.save();var o=(new p).scale(n/e.width,s/e.height).translate(-e.x,-e.y);o.applyToContext(a),i&&i.draw(a,new r({clip:!0,matrices:[o]})),this._matrix.applyToContext(a);var h=this.getElement(),u=this._size;h&&a.drawImage(h,-u.width/2,-u.height/2),a.restore();for(var l=a.getImageData(.5,.5,Math.ceil(n),Math.ceil(s)).data,c=[0,0,0],f=0,_=0,v=l.length;_<v;_+=4){var m=l[_+3];f+=m,m/=255,c[0]+=l[_]*m,c[1]+=l[_+1]*m,c[2]+=l[_+2]*m}for(_=0;_<3;_++)c[_]/=f;return f?F.read(c):null},getPixel:function(){var t=c.read(arguments),e=this.getContext().getImageData(t.x,t.y,1,1).data;return new F("rgb",[e[0]/255,e[1]/255,e[2]/255],e[3]/255)},setPixel:function(){var t=c.read(arguments),e=F.read(arguments),i=e._convert("rgb"),n=e._alpha,r=this.getContext(!0),s=r.createImageData(1,1),a=s.data;a[0]=255*i[0],a[1]=255*i[1],a[2]=255*i[2],a[3]=null!=n?255*n:255,r.putImageData(s,t.x,t.y)},createImageData:function(){var t=d.read(arguments);return this.getContext().createImageData(t.width,t.height)},getImageData:function(){var t=g.read(arguments);return t.isEmpty()&&(t=new g(this._size)),this.getContext().getImageData(t.x,t.y,t.width,t.height)},setImageData:function(t){var e=c.read(arguments,1);this.getContext(!0).putImageData(t,e.x,e.y)},_getBounds:function(t,e){var i=new g(this._size).setCenter(0,0);return t?t._transformBounds(i):i},_hitTestSelf:function(t){if(this._contains(t)){var e=this;return new M("pixel",e,{offset:t.add(e._size.divide(2)).round(),color:{get:function(){return e.getPixel(this.offset)}}})}},_draw:function(t){var e=this.getElement();e&&(t.globalAlpha=this._opacity,t.drawImage(e,-this._size.width/2,-this._size.height/2))},_canComposite:function(){return!0}}),P=w.extend({_class:"SymbolItem",_applyMatrix:!1,_canApplyMatrix:!1,_boundsOptions:{stroke:!0},_serializeFields:{symbol:null},initialize:function(t,i){this._initialize(t,i!==e&&c.read(arguments,1))||this.setDefinition(t instanceof I?t:new I(t))},_equals:function(t){return this._definition===t._definition},copyContent:function(t){this.setDefinition(t._definition)},getDefinition:function(){return this._definition},setDefinition:function(t){this._definition=t,this._changed(9)},getSymbol:"#getDefinition",setSymbol:"#setDefinition",isEmpty:function(){return this._definition._item.isEmpty()},_getBounds:function(t,e){var i=this._definition._item;return i._getCachedBounds(i._matrix.prepended(t),e)},_hitTestSelf:function(t,e,i){var n=this._definition._item._hitTest(t,e,i);return n&&(n.item=this),n},_draw:function(t,e){this._definition._item.draw(t,e)}}),I=r.extend({_class:"SymbolDefinition",initialize:function(t,e){this._id=l.get(),this.project=paper.project,t&&this.setItem(t,e)},_serialize:function(t,e){return e.add(this,function(){return r.serialize([this._class,this._item],t,!1,e)})},_changed:function(t){8&t&&w._clearBoundsCache(this),1&t&&this.project._changed(t)},getItem:function(){return this._item},setItem:function(t,e){t._symbol&&(t=t.clone()),this._item&&(this._item._symbol=null),this._item=t,t.remove(),t.setSelected(!1),e||t.setPosition(new c),t._symbol=this,this._changed(9)},getDefinition:"#getItem",setDefinition:"#setItem",place:function(t){return new P(this,t)},clone:function(){return new I(this._item.clone(!1))},equals:function(t){return t===this||t&&this._item.equals(t._item)||!1}}),M=r.extend({_class:"HitResult",initialize:function(t,e,i){this.type=t,this.item=e,i&&this.inject(i)},statics:{getOptions:function(t){var e=t&&r.read(t);return r.set({type:null,tolerance:paper.settings.hitTolerance,fill:!e,stroke:!e,segments:!e,handles:!1,ends:!1,position:!1,center:!1,bounds:!1,guides:!1,selected:!1},e)}}}),T=r.extend({_class:"Segment",beans:!0,_selection:0,initialize:function(t,i,n,r,s,a){var o,h,u,l,c=arguments.length;c>0&&(null==t||"object"==typeof t?1===c&&t&&"point"in t?(o=t.point,h=t.handleIn,u=t.handleOut,l=t.selection):(o=t,h=i,u=n,l=r):(o=[t,i],h=n!==e?[n,r]:null,u=s!==e?[s,a]:null)),new z(o,this,"_point"),new z(h,this,"_handleIn"),new z(u,this,"_handleOut"),l&&this.setSelection(l)},_serialize:function(t,e){var i=this._point,n=this._selection,s=n||this.hasHandles()?[i,this._handleIn,this._handleOut]:i;return n&&s.push(n),r.serialize(s,t,!0,e)},_changed:function(t){var e=this._path;if(e){var i,n=e._curves,r=this._index;n&&(t&&t!==this._point&&t!==this._handleIn||!(i=r>0?n[r-1]:e._closed?n[n.length-1]:null)||i._changed(),t&&t!==this._point&&t!==this._handleOut||!(i=n[r])||i._changed()),e._changed(25)}},getPoint:function(){return this._point},setPoint:function(){this._point.set(c.read(arguments))},getHandleIn:function(){return this._handleIn},setHandleIn:function(){this._handleIn.set(c.read(arguments))},getHandleOut:function(){return this._handleOut},setHandleOut:function(){this._handleOut.set(c.read(arguments))},hasHandles:function(){return!this._handleIn.isZero()||!this._handleOut.isZero()},isSmooth:function(){var t=this._handleIn,e=this._handleOut;return!t.isZero()&&!e.isZero()&&t.isCollinear(e)},clearHandles:function(){this._handleIn._set(0,0),this._handleOut._set(0,0)},getSelection:function(){return this._selection},setSelection:function(t){var e=this._selection,i=this._path;this._selection=t=t||0,i&&t!==e&&(i._updateSelection(this,e,t),i._changed(129))},_changeSelection:function(t,e){var i=this._selection;this.setSelection(e?i|t:i&~t)},isSelected:function(){return!!(7&this._selection)},setSelected:function(t){this._changeSelection(7,t)},getIndex:function(){return this._index!==e?this._index:null},getPath:function(){return this._path||null},getCurve:function(){var t=this._path,e=this._index;return t?(e>0&&!t._closed&&e===t._segments.length-1&&e--,t.getCurves()[e]||null):null},getLocation:function(){var t=this.getCurve();return t?new O(t,this===t._segment1?0:1):null},getNext:function(){var t=this._path&&this._path._segments;return t&&(t[this._index+1]||this._path._closed&&t[0])||null},smooth:function(t,i,n){var r=t||{},s=r.type,a=r.factor,o=this.getPrevious(),h=this.getNext(),u=(o||this)._point,l=this._point,f=(h||this)._point,d=u.getDistance(l),_=l.getDistance(f);if(s&&"catmull-rom"!==s){if("geometric"!==s)throw new Error("Smoothing method '"+s+"' not supported.");if(o&&h){var g=u.subtract(f),v=a===e?.4:a,p=v*d/(d+_);i||this.setHandleIn(g.multiply(p)),n||this.setHandleOut(g.multiply(p-v))}}else{var m=a===e?.5:a,y=Math.pow(d,m),w=y*y,x=Math.pow(_,m),b=x*x;if(!i&&o){var C=2*b+3*x*y+w,S=3*x*(x+y);this.setHandleIn(0!==S?new c((b*u._x+C*l._x-w*f._x)/S-l._x,(b*u._y+C*l._y-w*f._y)/S-l._y):new c)}if(!n&&h){var C=2*w+3*y*x+b,S=3*y*(y+x);this.setHandleOut(0!==S?new c((w*f._x+C*l._x-b*u._x)/S-l._x,(w*f._y+C*l._y-b*u._y)/S-l._y):new c)}}},getPrevious:function(){var t=this._path&&this._path._segments;return t&&(t[this._index-1]||this._path._closed&&t[t.length-1])||null},isFirst:function(){return!this._index},isLast:function(){var t=this._path;return t&&this._index===t._segments.length-1||!1},reverse:function(){var t=this._handleIn,e=this._handleOut,i=t.clone();t.set(e),e.set(i)},reversed:function(){return new T(this._point,this._handleOut,this._handleIn)},remove:function(){return!!this._path&&!!this._path.removeSegment(this._index)},clone:function(){return new T(this._point,this._handleIn,this._handleOut)},equals:function(t){return t===this||t&&this._class===t._class&&this._point.equals(t._point)&&this._handleIn.equals(t._handleIn)&&this._handleOut.equals(t._handleOut)||!1},toString:function(){var t=["point: "+this._point];return this._handleIn.isZero()||t.push("handleIn: "+this._handleIn),this._handleOut.isZero()||t.push("handleOut: "+this._handleOut),"{ "+t.join(", ")+" }"},transform:function(t){this._transformCoordinates(t,new Array(6),!0),this._changed()},interpolate:function(t,e,i){var n=1-i,r=i,s=t._point,a=e._point,o=t._handleIn,h=e._handleIn,u=e._handleOut,l=t._handleOut;this._point._set(n*s._x+r*a._x,n*s._y+r*a._y,!0),this._handleIn._set(n*o._x+r*h._x,n*o._y+r*h._y,!0),this._handleOut._set(n*l._x+r*u._x,n*l._y+r*u._y,!0),this._changed()},_transformCoordinates:function(t,e,i){var n=this._point,r=i&&this._handleIn.isZero()?null:this._handleIn,s=i&&this._handleOut.isZero()?null:this._handleOut,a=n._x,o=n._y,h=2;return e[0]=a,e[1]=o,r&&(e[h++]=r._x+a,e[h++]=r._y+o),s&&(e[h++]=s._x+a,e[h++]=s._y+o),t&&(t._transformCoordinates(e,e,h/2),a=e[0],o=e[1],i?(n._x=a,n._y=o,h=2,r&&(r._x=e[h++]-a,r._y=e[h++]-o),s&&(s._x=e[h++]-a,s._y=e[h++]-o)):(r||(e[h++]=a,e[h++]=o),s||(e[h++]=a,e[h++]=o))),e}}),z=c.extend({initialize:function(t,i,n){var r,s,a;if(t)if((r=t[0])!==e)s=t[1];else{var o=t;(r=o.x)===e&&(r=(o=c.read(arguments)).x),s=o.y,a=o.selected}else r=s=0;this._x=r,this._y=s,this._owner=i,i[n]=this,a&&this.setSelected(!0)},_set:function(t,e){return this._x=t,this._y=e,this._owner._changed(this),this},getX:function(){return this._x},setX:function(t){this._x=t,this._owner._changed(this)},getY:function(){return this._y},setY:function(t){this._y=t,this._owner._changed(this)},isZero:function(){var t=u.isZero;return t(this._x)&&t(this._y)},isSelected:function(){return!!(this._owner._selection&this._getSelection())},setSelected:function(t){this._owner._changeSelection(this._getSelection(),t)},_getSelection:function(){var t=this._owner;return this===t._point?1:this===t._handleIn?2:this===t._handleOut?4:0}}),k=r.extend({_class:"Curve",beans:!0,initialize:function(t,e,i,n,r,s,a,o){var h,u,l,c,f,d,_=arguments.length;3===_?(this._path=t,h=e,u=i):_?1===_?"segment1"in t?(h=new T(t.segment1),u=new T(t.segment2)):"point1"in t?(l=t.point1,f=t.handle1,d=t.handle2,c=t.point2):Array.isArray(t)&&(l=[t[0],t[1]],c=[t[6],t[7]],f=[t[2]-t[0],t[3]-t[1]],d=[t[4]-t[6],t[5]-t[7]]):2===_?(h=new T(t),u=new T(e)):4===_?(l=t,f=e,d=i,c=n):8===_&&(l=[t,e],c=[a,o],f=[i-t,n-e],d=[r-a,s-o]):(h=new T,u=new T),this._segment1=h||new T(l,null,f),this._segment2=u||new T(c,d,null)},_serialize:function(t,e){return r.serialize(this.hasHandles()?[this.getPoint1(),this.getHandle1(),this.getHandle2(),this.getPoint2()]:[this.getPoint1(),this.getPoint2()],t,!0,e)},_changed:function(){this._length=this._bounds=e},clone:function(){return new k(this._segment1,this._segment2)},toString:function(){var t=["point1: "+this._segment1._point];return this._segment1._handleOut.isZero()||t.push("handle1: "+this._segment1._handleOut),this._segment2._handleIn.isZero()||t.push("handle2: "+this._segment2._handleIn),t.push("point2: "+this._segment2._point),"{ "+t.join(", ")+" }"},classify:function(){return k.classify(this.getValues())},remove:function(){var t=!1;if(this._path){var e=this._segment2,i=e._handleOut;(t=e.remove())&&this._segment1._handleOut.set(i)}return t},getPoint1:function(){return this._segment1._point},setPoint1:function(){this._segment1._point.set(c.read(arguments))},getPoint2:function(){return this._segment2._point},setPoint2:function(){this._segment2._point.set(c.read(arguments))},getHandle1:function(){return this._segment1._handleOut},setHandle1:function(){this._segment1._handleOut.set(c.read(arguments))},getHandle2:function(){return this._segment2._handleIn},setHandle2:function(){this._segment2._handleIn.set(c.read(arguments))},getSegment1:function(){return this._segment1},getSegment2:function(){return this._segment2},getPath:function(){return this._path},getIndex:function(){return this._segment1._index},getNext:function(){var t=this._path&&this._path._curves;return t&&(t[this._segment1._index+1]||this._path._closed&&t[0])||null},getPrevious:function(){var t=this._path&&this._path._curves;return t&&(t[this._segment1._index-1]||this._path._closed&&t[t.length-1])||null},isFirst:function(){return!this._segment1._index},isLast:function(){var t=this._path;return t&&this._segment1._index===t._curves.length-1||!1},isSelected:function(){return this.getPoint1().isSelected()&&this.getHandle1().isSelected()&&this.getHandle2().isSelected()&&this.getPoint2().isSelected()},setSelected:function(t){this.getPoint1().setSelected(t),this.getHandle1().setSelected(t),this.getHandle2().setSelected(t),this.getPoint2().setSelected(t)},getValues:function(t){return k.getValues(this._segment1,this._segment2,t)},getPoints:function(){for(var t=this.getValues(),e=[],i=0;i<8;i+=2)e.push(new c(t[i],t[i+1]));return e}},{getLength:function(){return null==this._length&&(this._length=k.getLength(this.getValues(),0,1)),this._length},getArea:function(){return k.getArea(this.getValues())},getLine:function(){return new m(this._segment1._point,this._segment2._point)},getPart:function(t,e){return new k(k.getPart(this.getValues(),t,e))},getPartLength:function(t,e){return k.getLength(this.getValues(),t,e)},divideAt:function(t){return this.divideAtTime(t&&t.curve===this?t.time:this.getTimeAt(t))},divideAtTime:function(t,e){var i=null;if(t>=1e-8&&t<=1-1e-8){var n=k.subdivide(this.getValues(),t),r=n[0],s=n[1],a=e||this.hasHandles(),o=this._segment1,h=this._segment2,u=this._path;a&&(o._handleOut._set(r[2]-r[0],r[3]-r[1]),h._handleIn._set(s[4]-s[6],s[5]-s[7]));var l=r[6],f=r[7],d=new T(new c(l,f),a&&new c(r[4]-l,r[5]-f),a&&new c(s[2]-l,s[3]-f));u?(u.insert(o._index+1,d),i=this.getNext()):(this._segment2=d,this._changed(),i=new k(d,h))}return i},splitAt:function(t){var e=this._path;return e?e.splitAt(t):null},splitAtTime:function(t){return this.splitAt(this.getLocationAtTime(t))},divide:function(t,i){return this.divideAtTime(t===e?.5:i?t:this.getTimeAt(t))},split:function(t,i){return this.splitAtTime(t===e?.5:i?t:this.getTimeAt(t))},reversed:function(){return new k(this._segment2.reversed(),this._segment1.reversed())},clearHandles:function(){this._segment1._handleOut._set(0,0),this._segment2._handleIn._set(0,0)},statics:{getValues:function(t,e,i,n){var r=t._point,s=t._handleOut,a=e._handleIn,o=e._point,h=r.x,u=r.y,l=o.x,c=o.y,f=n?[h,u,h,u,l,c,l,c]:[h,u,h+s._x,u+s._y,l+a._x,c+a._y,l,c];return i&&i._transformCoordinates(f,f,4),f},subdivide:function(t,i){var n=t[0],r=t[1],s=t[2],a=t[3],o=t[4],h=t[5],u=t[6],l=t[7];i===e&&(i=.5);var c=1-i,f=c*n+i*s,d=c*r+i*a,_=c*s+i*o,g=c*a+i*h,v=c*o+i*u,p=c*h+i*l,m=c*f+i*_,y=c*d+i*g,w=c*_+i*v,x=c*g+i*p,b=c*m+i*w,C=c*y+i*x;return[[n,r,f,d,m,y,b,C],[b,C,w,x,v,p,u,l]]},getMonoCurves:function(t,e){var i=[],n=e?0:1,r=t[n+0],s=t[n+2],a=t[n+4],o=t[n+6];if(r>=s==s>=a&&s>=a==a>=o||k.isStraight(t))i.push(t);else{var h=3*(s-a)-r+o,l=2*(r+a)-4*s,c=s-r,f=[],d=u.solveQuadratic(h,l,c,f,1e-8,1-1e-8);if(d){f.sort();var _=f[0],g=k.subdivide(t,_);i.push(g[0]),d>1&&(_=(f[1]-_)/(1-_),g=k.subdivide(g[1],_),i.push(g[0])),i.push(g[1])}else i.push(t)}return i},solveCubic:function(t,e,i,n,r,s){var a=t[e],o=t[e+2],h=t[e+4],l=t[e+6],c=0;if(!(a<i&&l<i&&o<i&&h<i||a>i&&l>i&&o>i&&h>i)){var f=3*(o-a),d=3*(h-o)-f,_=l-a-f-d;c=u.solveCubic(_,d,f,a-i,n,r,s)}return c},getTimeOf:function(t,e){var i=new c(t[0],t[1]),n=new c(t[6],t[7]);if(null===(e.isClose(i,1e-12)?0:e.isClose(n,1e-12)?1:null))for(var r=[e.x,e.y],s=[],a=0;a<2;a++)for(var o=k.solveCubic(t,a,r[a],s,0,1),h=0;h<o;h++){var u=s[h];if(e.isClose(k.getPoint(t,u),1e-7))return u}return e.isClose(i,1e-7)?0:e.isClose(n,1e-7)?1:null},getNearestTime:function(t,e){function i(i){if(i>=0&&i<=1){var n=e.getDistance(k.getPoint(t,i),!0);if(n<u)return u=n,l=i,!0}}if(k.isStraight(t)){var n=t[0],r=t[1],s=t[6]-n,a=t[7]-r,o=s*s+a*a;if(0===o)return 0;var h=((e.x-n)*s+(e.y-r)*a)/o;return h<1e-12?0:h>.999999999999?1:k.getTimeOf(t,new c(n+h*s,r+h*a))}for(var u=1/0,l=0,f=0;f<=100;f++)i(f/100);for(var d=.005;d>1e-8;)i(l-d)||i(l+d)||(d/=2);return l},getPart:function(t,e,i){var n=e>i;if(n){var r=e;e=i,i=r}return e>0&&(t=k.subdivide(t,e)[1]),i<1&&(t=k.subdivide(t,(i-e)/(1-e))[0]),n?[t[6],t[7],t[4],t[5],t[2],t[3],t[0],t[1]]:t},isFlatEnough:function(t,e){var i=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],h=t[6],u=t[7],l=3*r-2*i-h,c=3*s-2*n-u,f=3*a-2*h-i,d=3*o-2*u-n;return Math.max(l*l,f*f)+Math.max(c*c,d*d)<=16*e*e},getArea:function(t){var e=t[0],i=t[1],n=t[2],r=t[3],s=t[4],a=t[5],o=t[6],h=t[7];return 3*((h-i)*(n+s)-(o-e)*(r+a)+r*(e-s)-n*(i-a)+h*(s+e/3)-o*(a+i/3))/20},getBounds:function(t){for(var e=t.slice(0,2),i=e.slice(),n=[0,0],r=0;r<2;r++)k._addBounds(t[r],t[r+2],t[r+4],t[r+6],r,0,e,i,n);return new g(e[0],e[1],i[0]-e[0],i[1]-e[1])},_addBounds:function(t,e,i,n,r,s,a,o,h){function l(t,e){var i=t-e,n=t+e;i<a[r]&&(a[r]=i),n>o[r]&&(o[r]=n)}s/=2;var c=a[r]-s,f=o[r]+s;if(t<c||e<c||i<c||n<c||t>f||e>f||i>f||n>f)if(e<t!=e<n&&i<t!=i<n)l(t,s),l(n,s);else{var d=3*(e-i)-t+n,_=2*(t+i)-4*e,g=e-t,v=u.solveQuadratic(d,_,g,h);l(n,0);for(var p=0;p<v;p++){var m=h[p],y=1-m;1e-8<=m&&m<=1-1e-8&&l(y*y*y*t+3*y*y*m*e+3*y*m*m*i+m*m*m*n,s)}}}}},r.each(["getBounds","getStrokeBounds","getHandleBounds"],function(t){this[t]=function(){this._bounds||(this._bounds={});var e=this._bounds[t];return e||(e=this._bounds[t]=L[t]([this._segment1,this._segment2],!1,this._path)),e.clone()}},{}),r.each({isStraight:function(t,e,i,n){if(e.isZero()&&i.isZero())return!0;var r=n.subtract(t);if(r.isZero())return!1;if(r.isCollinear(e)&&r.isCollinear(i)){var s=new m(t,n);if(s.getDistance(t.add(e))<1e-7&&s.getDistance(n.add(i))<1e-7){var a=r.dot(r),o=r.dot(e)/a,h=r.dot(i)/a;return o>=0&&o<=1&&h<=0&&h>=-1}}return!1},isLinear:function(t,e,i,n){var r=n.subtract(t).divide(3);return e.equals(r)&&i.negate().equals(r)}},function(t,e){this[e]=function(e){var i=this._segment1,n=this._segment2;return t(i._point,i._handleOut,n._handleIn,n._point,e)},this.statics[e]=function(e,i){var n=e[0],r=e[1],s=e[6],a=e[7];return t(new c(n,r),new c(e[2]-n,e[3]-r),new c(e[4]-s,e[5]-a),new c(s,a),i)}},{statics:{},hasHandles:function(){return!this._segment1._handleOut.isZero()||!this._segment2._handleIn.isZero()},hasLength:function(t){return(!this.getPoint1().equals(this.getPoint2())||this.hasHandles())&&this.getLength()>(t||0)},isCollinear:function(t){return t&&this.isStraight()&&t.isStraight()&&this.getLine().isCollinear(t.getLine())},isHorizontal:function(){return this.isStraight()&&Math.abs(this.getTangentAtTime(.5).y)<1e-8},isVertical:function(){return this.isStraight()&&Math.abs(this.getTangentAtTime(.5).x)<1e-8}}),{beans:!1,getLocationAt:function(t,e){return this.getLocationAtTime(e?t:this.getTimeAt(t))},getLocationAtTime:function(t){return null!=t&&t>=0&&t<=1?new O(this,t):null},getTimeAt:function(t,e){return k.getTimeAt(this.getValues(),t,e)},getParameterAt:"#getTimeAt",getOffsetAtTime:function(t){return this.getPartLength(0,t)},getLocationOf:function(){return this.getLocationAtTime(this.getTimeOf(c.read(arguments)))},getOffsetOf:function(){var t=this.getLocationOf.apply(this,arguments);return t?t.getOffset():null},getTimeOf:function(){return k.getTimeOf(this.getValues(),c.read(arguments))},getParameterOf:"#getTimeOf",getNearestLocation:function(){var t=c.read(arguments),e=this.getValues(),i=k.getNearestTime(e,t),n=k.getPoint(e,i);return new O(this,i,n,null,t.getDistance(n))},getNearestPoint:function(){var t=this.getNearestLocation.apply(this,arguments);return t?t.getPoint():t}},new function(){var t=["getPoint","getTangent","getNormal","getWeightedTangent","getWeightedNormal","getCurvature"];return r.each(t,function(t){this[t+"At"]=function(e,i){var n=this.getValues();return k[t](n,i?e:k.getTimeAt(n,e))},this[t+"AtTime"]=function(e){return k[t](this.getValues(),e)}},{statics:{_evaluateMethods:t}})},new function(){function t(t){var e=t[0],i=t[1],n=t[2],r=t[3],s=t[4],a=t[5],o=9*(n-s)+3*(t[6]-e),h=6*(e+s)-12*n,u=3*(n-e),l=9*(r-a)+3*(t[7]-i),c=6*(i+a)-12*r,f=3*(r-i);return function(t){var e=(o*t+h)*t+u,i=(l*t+c)*t+f;return Math.sqrt(e*e+i*i)}}function i(t,e){return Math.max(2,Math.min(16,Math.ceil(32*Math.abs(e-t))))}function n(t,e,i,n){if(null==e||e<0||e>1)return null;var r=t[0],s=t[1],a=t[2],o=t[3],h=t[4],l=t[5],f=t[6],d=t[7],_=u.isZero;_(a-r)&&_(o-s)&&(a=r,o=s),_(h-f)&&_(l-d)&&(h=f,l=d);var g,v,p=3*(a-r),m=3*(h-a)-p,y=f-r-p-m,w=3*(o-s),x=3*(l-o)-w,b=d-s-w-x;if(0===i)g=0===e?r:1===e?f:((y*e+m)*e+p)*e+r,v=0===e?s:1===e?d:((b*e+x)*e+w)*e+s;else{if(e<1e-8?(g=p,v=w):e>1-1e-8?(g=3*(f-h),v=3*(d-l)):(g=(3*y*e+2*m)*e+p,v=(3*b*e+2*x)*e+w),n){0===g&&0===v&&(e<1e-8||e>1-1e-8)&&(g=h-a,v=l-o);var C=Math.sqrt(g*g+v*v);C&&(g/=C,v/=C)}if(3===i){var h=6*y*e+2*m,l=6*b*e+2*x,S=Math.pow(g*g+v*v,1.5);g=0!==S?(g*l-v*h)/S:0,v=0}}return 2===i?new c(v,-g):new c(g,v)}return{statics:{classify:function(t){function i(t,i,n){var r=i!==e,s=r&&i>0&&i<1,a=r&&n>0&&n<1;return!r||(s||a)&&("loop"!==t||s&&a)||(t="arch",s=a=!1),{type:t,roots:s||a?s&&a?i<n?[i,n]:[n,i]:[s?i:n]:null}}var n=t[0],r=t[1],s=t[2],a=t[3],o=t[4],h=t[5],l=t[6],c=t[7],f=s*(r-c)+a*(l-n)+n*c-r*l,d=3*(o*(a-r)+h*(n-s)+s*r-a*n),_=d-f,g=_-f+(n*(c-h)+r*(o-l)+l*h-c*o),v=Math.sqrt(g*g+_*_+d*d),p=0!==v?1/v:0,m=u.isZero;if(g*=p,_*=p,d*=p,m(g))return m(_)?i(m(d)?"line":"quadratic"):i("serpentine",d/(3*_));var y=3*_*_-4*g*d;if(m(y))return i("cusp",_/(2*g));var w=y>0?Math.sqrt(y/3):Math.sqrt(-y),x=2*g;return i(y>0?"serpentine":"loop",(_+w)/x,(_-w)/x)},getLength:function(n,r,s,a){if(r===e&&(r=0),s===e&&(s=1),k.isStraight(n)){var o=n;s<1&&(o=k.subdivide(o,s)[0],r/=s),r>0&&(o=k.subdivide(o,r)[1]);var h=o[6]-o[0],l=o[7]-o[1];return Math.sqrt(h*h+l*l)}return u.integrate(a||t(n),r,s,i(r,s))},getTimeAt:function(n,r,s){if(s===e&&(s=r<0?1:0),0===r)return s;var a=Math.abs,o=r>0,h=o?s:0,l=o?1:s,c=t(n),f=k.getLength(n,h,l,c),d=a(r)-f;if(a(d)<1e-12)return o?l:h;if(d>1e-12)return null;var _=r/f,g=0;return u.findRoot(function(t){return g+=u.integrate(c,s,t,i(s,t)),s=t,g-r},c,s+_,h,l,32,1e-12)},getPoint:function(t,e){return n(t,e,0,!1)},getTangent:function(t,e){return n(t,e,1,!0)},getWeightedTangent:function(t,e){return n(t,e,1,!1)},getNormal:function(t,e){return n(t,e,2,!0)},getWeightedNormal:function(t,e){return n(t,e,2,!1)},getCurvature:function(t,e){return n(t,e,3,!1).x},getPeaks:function(t){var e=t[0],i=t[1],n=t[2],r=t[3],s=t[4],a=t[5],o=3*n-e-3*s+t[6],h=3*e-6*n+3*s,l=-3*e+3*n,c=3*r-i-3*a+t[7],f=3*i-6*r+3*a,d=-3*i+3*r,_=[];return u.solveCubic(9*(o*o+c*c),9*(o*h+f*c),2*(h*h+f*f)+3*(l*o+d*c),l*h+f*d,_,1e-8,1-1e-8),_.sort()}}}},new function(){function t(t,e,i,n,r,s,a){var o=!a&&i.getPrevious()===r,h=!a&&i!==r&&i.getNext()===r;if(null!==n&&n>=(o?1e-8:0)&&n<=(h?1-1e-8:1)&&null!==s&&s>=(h?1e-8:0)&&s<=(o?1-1e-8:1)){var u=new O(i,n,null,a),l=new O(r,s,null,a);u._intersection=l,l._intersection=u,e&&!e(u)||O.insert(t,u,!0)}}function e(r,s,a,o,h,u,l,c,f,d,_,g,v){if(++f>=4096||++c>=40)return f;var p,y,w=s[0],x=s[1],b=s[6],C=s[7],S=m.getSignedDistance,P=S(w,x,b,C,s[2],s[3]),I=S(w,x,b,C,s[4],s[5]),M=P*I>0?.75:4/9,T=M*Math.min(0,P,I),z=M*Math.max(0,P,I),O=S(w,x,b,C,r[0],r[1]),A=S(w,x,b,C,r[2],r[3]),L=S(w,x,b,C,r[4],r[5]),N=S(w,x,b,C,r[6],r[7]),B=i(O,A,L,N),D=B[0],j=B[1];if(0===P&&0===I&&0===O&&0===A&&0===L&&0===N||null==(p=n(D,j,T,z))||null==(y=n(D.reverse(),j.reverse(),T,z)))return f;var E=d+(_-d)*p,F=d+(_-d)*y;if(Math.max(v-g,F-E)<1e-9){var R=(E+F)/2,q=(g+v)/2;t(h,u,l?o:a,l?q:R,l?a:o,l?R:q)}else if(r=k.getPart(r,p,y),y-p>.8)if(F-E>v-g){R=(E+F)/2;f=e(s,(V=k.subdivide(r,.5))[0],o,a,h,u,!l,c,f,g,v,E,R),f=e(s,V[1],o,a,h,u,!l,c,f,g,v,R,F)}else{var V=k.subdivide(s,.5),q=(g+v)/2;f=e(V[0],r,o,a,h,u,!l,c,f,g,q,E,F),f=e(V[1],r,o,a,h,u,!l,c,f,q,v,E,F)}else f=v-g>=1e-9?e(s,r,o,a,h,u,!l,c,f,g,v,E,F):e(r,s,a,o,h,u,l,c,f,E,F,g,v);return f}function i(t,e,i,n){var r,s=[0,t],a=[1/3,e],o=[2/3,i],h=[1,n],u=e-(2*t+n)/3,l=i-(t+2*n)/3;if(u*l<0)r=[[s,a,h],[s,o,h]];else{var c=u/l;r=[c>=2?[s,a,h]:c<=.5?[s,o,h]:[s,a,o,h],[s,h]]}return(u||l)<0?r.reverse():r}function n(t,e,i,n){return t[0][1]<i?r(t,!0,i):e[0][1]>n?r(e,!1,n):t[0][0]}function r(t,e,i){for(var n=t[0][0],r=t[0][1],s=1,a=t.length;s<a;s++){var o=t[s][0],h=t[s][1];if(e?h>=i:h<=i)return h===i?o:n+(i-r)*(o-n)/(h-r);n=o,r=h}return null}function s(t,e,i,n,r){var s=u.isZero;if(s(n)&&s(r)){var a=k.getTimeOf(t,new c(e,i));return null===a?[]:[a]}for(var o=Math.atan2(-r,n),h=Math.sin(o),l=Math.cos(o),f=[],d=[],_=0;_<8;_+=2){var g=t[_]-e,v=t[_+1]-i;f.push(g*l-v*h,g*h+v*l)}return k.solveCubic(f,1,0,d,0,1),d}function a(e,i,n,r,a,o,h){for(var u=i[0],l=i[1],c=s(e,u,l,i[6]-u,i[7]-l),f=0,d=c.length;f<d;f++){var _=c[f],g=k.getPoint(e,_),v=k.getTimeOf(i,g);null!==v&&t(a,o,h?r:n,h?v:_,h?n:r,h?_:v)}}function o(e,i,n,r,s,a){var o=m.intersect(e[0],e[1],e[6],e[7],i[0],i[1],i[6],i[7]);o&&t(s,a,n,k.getTimeOf(e,o),r,k.getTimeOf(i,o))}function h(i,n,r,s,h,u){var l=Math.min,d=Math.max;if(d(i[0],i[2],i[4],i[6])+1e-12>l(n[0],n[2],n[4],n[6])&&l(i[0],i[2],i[4],i[6])-1e-12<d(n[0],n[2],n[4],n[6])&&d(i[1],i[3],i[5],i[7])+1e-12>l(n[1],n[3],n[5],n[7])&&l(i[1],i[3],i[5],i[7])-1e-12<d(n[1],n[3],n[5],n[7])){var _=f(i,n);if(_)for(x=0;x<2;x++){var g=_[x];t(h,u,r,g[0],s,g[1],!0)}else{var v=k.isStraight(i),p=k.isStraight(n),m=v&&p,y=v&&!p,w=h.length;if((m?o:v||p?a:e)(y?n:i,y?i:n,y?s:r,y?r:s,h,u,y,0,0,0,1,0,1),!m||h.length===w)for(var x=0;x<4;x++){var b=x>>1,C=1&x,S=6*b,P=6*C,I=new c(i[S],i[S+1]),M=new c(n[P],n[P+1]);I.isClose(M,1e-12)&&t(h,u,r,b,s,C)}}}return h}function l(e,i,n,r){var s=k.classify(e);if("loop"===s.type){var a=s.roots;t(n,r,i,a[0],i,a[1])}return n}function f(t,e){function i(t){var e=t[6]-t[0],i=t[7]-t[1];return e*e+i*i}var n=Math.abs,r=m.getDistance,s=k.isStraight(t),a=k.isStraight(e),o=s&&a,h=i(t)<i(e),u=h?e:t,l=h?t:e,f=u[0],d=u[1],_=u[6]-f,g=u[7]-d;if(r(f,d,_,g,l[0],l[1],!0)<1e-7&&r(f,d,_,g,l[6],l[7],!0)<1e-7)!o&&r(f,d,_,g,u[2],u[3],!0)<1e-7&&r(f,d,_,g,u[4],u[5],!0)<1e-7&&r(f,d,_,g,l[2],l[3],!0)<1e-7&&r(f,d,_,g,l[4],l[5],!0)<1e-7&&(s=a=o=!0);else if(o)return null;if(s^a)return null;for(var v=[t,e],p=[],y=0;y<4&&p.length<2;y++){var w=1&y,x=1^w,b=y>>1,C=k.getTimeOf(v[w],new c(v[x][b?6:0],v[x][b?7:1]));if(null!=C){var S=w?[b,C]:[C,b];(!p.length||n(S[0]-p[0][0])>1e-8&&n(S[1]-p[0][1])>1e-8)&&p.push(S)}if(y>2&&!p.length)break}if(2!==p.length)p=null;else if(!o){var P=k.getPart(t,p[0][0],p[1][0]),I=k.getPart(e,p[0][1],p[1][1]);(n(I[2]-P[2])>1e-7||n(I[3]-P[3])>1e-7||n(I[4]-P[4])>1e-7||n(I[5]-P[5])>1e-7)&&(p=null)}return p}return{getIntersections:function(t){var e=this.getValues(),i=t&&t!==this&&t.getValues();return i?h(e,i,this,t,[]):l(e,this,[])},statics:{getOverlaps:f,getIntersections:function(t,e,i,n,r,s){var a=!e;a&&(e=t);for(var o,u,c=t.length,f=e.length,d=[],_=[],g=0;g<f;g++)d[g]=e[g].getValues(r);for(g=0;g<c;g++){var v=t[g],p=a?d[g]:v.getValues(n),m=v.getPath();m!==u&&(u=m,o=[],_.push(o)),a&&l(p,v,o,i);for(var y=a?g+1:0;y<f;y++){if(s&&o.length)return o;h(p,d[y],v,e[y],o,i)}}o=[];for(var g=0,w=_.length;g<w;g++)o.push.apply(o,_[g]);return o},getCurveLineIntersections:s}}}),O=r.extend({_class:"CurveLocation",initialize:function(t,e,i,n,r){if(e>=.99999999){var s=t.getNext();s&&(e=0,t=s)}this._setCurve(t),this._time=e,this._point=i||t.getPointAtTime(e),this._overlap=n,this._distance=r,this._intersection=this._next=this._previous=null},_setCurve:function(t){var e=t._path;this._path=e,this._version=e?e._version:0,this._curve=t,this._segment=null,this._segment1=t._segment1,this._segment2=t._segment2},_setSegment:function(t){this._setCurve(t.getCurve()),this._segment=t,this._time=t===this._segment1?0:1,this._point=t._point.clone()},getSegment:function(){var t=this._segment;if(!t){var e=this.getCurve(),i=this.getTime();0===i?t=e._segment1:1===i?t=e._segment2:null!=i&&(t=e.getPartLength(0,i)<e.getPartLength(i,1)?e._segment1:e._segment2),this._segment=t}return t},getCurve:function(){function t(t){var e=t&&t.getCurve();if(e&&null!=(i._time=e.getTimeOf(i._point)))return i._setCurve(e),e}var e=this._path,i=this;return e&&e._version!==this._version&&(this._time=this._offset=this._curveOffset=this._curve=null),this._curve||t(this._segment)||t(this._segment1)||t(this._segment2.getPrevious())},getPath:function(){var t=this.getCurve();return t&&t._path},getIndex:function(){var t=this.getCurve();return t&&t.getIndex()},getTime:function(){var t=this.getCurve(),e=this._time;return t&&null==e?this._time=t.getTimeOf(this._point):e},getParameter:"#getTime",getPoint:function(){return this._point},getOffset:function(){var t=this._offset;if(null==t){t=0;var e=this.getPath(),i=this.getIndex();if(e&&null!=i)for(var n=e.getCurves(),r=0;r<i;r++)t+=n[r].getLength();this._offset=t+=this.getCurveOffset()}return t},getCurveOffset:function(){var t=this._curveOffset;if(null==t){var e=this.getCurve(),i=this.getTime();this._curveOffset=t=null!=i&&e&&e.getPartLength(0,i)}return t},getIntersection:function(){return this._intersection},getDistance:function(){return this._distance},divide:function(){var t=this.getCurve(),e=t&&t.divideAtTime(this.getTime());return e&&this._setSegment(e._segment1),e},split:function(){var t=this.getCurve(),e=t._path,i=t&&t.splitAtTime(this.getTime());return i&&this._setSegment(e.getLastSegment()),i},equals:function(t,e){var i=this===t;if(!i&&t instanceof O){var n=this.getCurve(),r=t.getCurve(),s=n._path;if(s===r._path){var a=Math.abs,o=a(this.getOffset()-t.getOffset()),h=!e&&this._intersection,u=!e&&t._intersection;i=(o<1e-7||s&&a(s.getLength()-o)<1e-7)&&(!h&&!u||h&&u&&h.equals(u,!0))}}return i},toString:function(){var t=[],e=this.getPoint(),i=h.instance;e&&t.push("point: "+e);var n=this.getIndex();null!=n&&t.push("index: "+n);var r=this.getTime();return null!=r&&t.push("time: "+i.number(r)),null!=this._distance&&t.push("distance: "+i.number(this._distance)),"{ "+t.join(", ")+" }"},isTouching:function(){var t=this._intersection;if(t&&this.getTangent().isCollinear(t.getTangent())){var e=this.getCurve(),i=t.getCurve();return!(e.isStraight()&&i.isStraight()&&e.getLine().intersect(i.getLine()))}return!1},isCrossing:function(){function t(t,e){var i=t.getValues(),n=k.classify(i).roots||k.getPeaks(i),r=n.length,s=e&&r>1?n[r-1]:r>0?n[0]:.5;c.push(k.getLength(i,e?s:0,e?1:s)/2)}function e(t,e,i){return e<i?t>e&&t<i:t>e||t<i}var i=this._intersection;if(!i)return!1;var n=this.getTime(),r=i.getTime(),s=n>=1e-8&&n<=1-1e-8,a=r>=1e-8&&r<=1-1e-8;if(s&&a)return!this.isTouching();var o=this.getCurve(),h=n<1e-8?o.getPrevious():o,u=i.getCurve(),l=r<1e-8?u.getPrevious():u;if(n>1-1e-8&&(o=o.getNext()),r>1-1e-8&&(u=u.getNext()),!(h&&o&&l&&u))return!1;var c=[];s||(t(h,!0),t(o,!1)),a||(t(l,!0),t(u,!1));var f=this.getPoint(),d=Math.min.apply(Math,c),_=s?o.getTangentAtTime(n):o.getPointAt(d).subtract(f),g=s?_.negate():h.getPointAt(-d).subtract(f),v=a?u.getTangentAtTime(r):u.getPointAt(d).subtract(f),p=a?v.negate():l.getPointAt(-d).subtract(f),m=g.getAngle(),y=_.getAngle(),w=p.getAngle(),x=v.getAngle();return!!(s?e(m,w,x)^e(y,w,x)&&e(m,x,w)^e(y,x,w):e(w,m,y)^e(x,m,y)&&e(w,y,m)^e(x,y,m))},hasOverlap:function(){return!!this._overlap}},r.each(k._evaluateMethods,function(t){var e=t+"At";this[t]=function(){var t=this.getCurve(),i=this.getTime();return null!=i&&t&&t[e](i,!0)}},{preserve:!0}),new function(){function t(t,e,i){function n(i,n){for(var s=i+n;s>=-1&&s<=r;s+=n){var a=t[(s%r+r)%r];if(!e.getPoint().isClose(a.getPoint(),1e-7))break;if(e.equals(a))return a}return null}for(var r=t.length,s=0,a=r-1;s<=a;){var o,h=s+a>>>1,u=t[h];if(i&&(o=e.equals(u)?u:n(h,-1)||n(h,1)))return e._overlap&&(o._overlap=o._intersection._overlap=!0),o;var l=e.getPath(),c=u.getPath();(l!==c?l._id-c._id:e.getIndex()+e.getTime()-(u.getIndex()+u.getTime()))<0?a=h-1:s=h+1}return t.splice(s,0,e),e}return{statics:{insert:t,expand:function(e){for(var i=e.slice(),n=e.length-1;n>=0;n--)t(i,e[n]._intersection,!1);return i}}}}),A=w.extend({_class:"PathItem",_selectBounds:!1,_canScaleStroke:!0,beans:!0,initialize:function(){},statics:{create:function(t){var e,i,n;if(r.isPlainObject(t)?(i=t.segments,e=t.pathData):Array.isArray(t)?i=t:"string"==typeof t&&(e=t),i){var s=i[0];n=s&&Array.isArray(s[0])}else e&&(n=(e.match(/m/gi)||[]).length>1||/z\s*\S+/i.test(e));return new(n?N:L)(t)}},_asPathItem:function(){return this},isClockwise:function(){return this.getArea()>=0},setClockwise:function(t){this.isClockwise()!=(t=!!t)&&this.reverse()},setPathData:function(t){function e(t,e){var i=+n[t];return o&&(i+=h[e]),i}function i(t){return new c(e(t,"x"),e(t+1,"y"))}var n,r,s,a=t&&t.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi),o=!1,h=new c,u=new c;this.clear();for(var l=0,f=a&&a.length;l<f;l++){var _=a[l],g=_[0],v=g.toLowerCase(),p=(n=_.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g))&&n.length;switch(o=g===v,"z"!==r||/[mz]/.test(v)||this.moveTo(h),v){case"m":case"l":for(var m="m"===v,y=0;y<p;y+=2)this[m?"moveTo":"lineTo"](h=i(y)),m&&(u=h,m=!1);s=h;break;case"h":case"v":var w="h"===v?"x":"y";h=h.clone();for(y=0;y<p;y++)h[w]=e(y,w),this.lineTo(h);s=h;break;case"c":for(y=0;y<p;y+=6)this.cubicCurveTo(i(y),s=i(y+2),h=i(y+4));break;case"s":for(y=0;y<p;y+=4)this.cubicCurveTo(/[cs]/.test(r)?h.multiply(2).subtract(s):h,s=i(y),h=i(y+2)),r=v;break;case"q":for(y=0;y<p;y+=4)this.quadraticCurveTo(s=i(y),h=i(y+2));break;case"t":for(y=0;y<p;y+=2)this.quadraticCurveTo(s=/[qt]/.test(r)?h.multiply(2).subtract(s):h,h=i(y)),r=v;break;case"a":for(y=0;y<p;y+=7)this.arcTo(h=i(y+5),new d(+n[y],+n[y+1]),+n[y+2],+n[y+4],+n[y+3]);break;case"z":this.closePath(1e-12),h=u}r=v}},_canComposite:function(){return!(this.hasFill()&&this.hasStroke())},_contains:function(t){var e=t.isInside(this.getBounds({internal:!0,handle:!0}))?this._getWinding(t):{};return e.onPath||!!("evenodd"===this.getFillRule()?1&e.windingL||1&e.windingR:e.winding)},getIntersections:function(t,e,i,n){var r=this===t||!t,s=this._matrix._orNullIfIdentity(),a=r?s:(i||t._matrix)._orNullIfIdentity();return r||this.getBounds(s).intersects(t.getBounds(a),1e-12)?k.getIntersections(this.getCurves(),!r&&t.getCurves(),e,s,a,n):[]},getCrossings:function(t){return this.getIntersections(t,function(t){return t.hasOverlap()||t.isCrossing()})},getNearestLocation:function(){for(var t=c.read(arguments),e=this.getCurves(),i=1/0,n=null,r=0,s=e.length;r<s;r++){var a=e[r].getNearestLocation(t);a._distance<i&&(i=a._distance,n=a)}return n},getNearestPoint:function(){var t=this.getNearestLocation.apply(this,arguments);return t?t.getPoint():t},interpolate:function(t,e,i){var n=!this._children,r=n?"_segments":"_children",s=t[r],a=e[r],o=this[r];if(!s||!a||s.length!==a.length)throw new Error("Invalid operands in interpolate() call: "+t+", "+e);var h=o.length,u=a.length;if(h<u)for(var l=n?T:L,c=h;c<u;c++)this.add(new l);else h>u&&this[n?"removeSegments":"removeChildren"](u,h);for(c=0;c<u;c++)o[c].interpolate(s[c],a[c],i);n&&(this.setClosed(t._closed),this._changed(9))},compare:function(t){var e=!1;if(t){var i=this._children||[this],n=t._children?t._children.slice():[t],r=i.length,s=n.length,a=[],o=0;e=!0;for(var h=r-1;h>=0&&e;h--){var u=i[h];e=!1;for(var l=s-1;l>=0&&!e;l--)u.compare(n[l])&&(a[l]||(a[l]=!0,o++),e=!0)}e=e&&o===s}return e}}),L=A.extend({_class:"Path",_serializeFields:{segments:[],closed:!1},initialize:function(t){this._closed=!1,this._segments=[],this._version=0;var i=Array.isArray(t)?"object"==typeof t[0]?t:arguments:!t||t.size!==e||t.x===e&&t.point===e?null:arguments;i&&i.length>0?this.setSegments(i):(this._curves=e,this._segmentSelection=0,i||"string"!=typeof t||(this.setPathData(t),t=null)),this._initialize(!i&&t)},_equals:function(t){return this._closed===t._closed&&r.equals(this._segments,t._segments)},copyContent:function(t){this.setSegments(t._segments),this._closed=t._closed},_changed:function t(i){if(t.base.call(this,i),8&i){if(this._length=this._area=e,16&i)this._version++;else if(this._curves)for(var n=0,r=this._curves.length;n<r;n++)this._curves[n]._changed()}else 32&i&&(this._bounds=e)},getStyle:function(){var t=this._parent;return(t instanceof N?t:this)._style},getSegments:function(){return this._segments},setSegments:function(t){var i=this.isFullySelected(),n=t&&t.length;if(this._segments.length=0,this._segmentSelection=0,this._curves=e,n){var r=t[n-1];"boolean"==typeof r&&(this.setClosed(r),n--),this._add(T.readList(t,0,{},n))}i&&this.setFullySelected(!0)},getFirstSegment:function(){return this._segments[0]},getLastSegment:function(){return this._segments[this._segments.length-1]},getCurves:function(){var t=this._curves,e=this._segments;if(!t){var i=this._countCurves();t=this._curves=new Array(i);for(var n=0;n<i;n++)t[n]=new k(this,e[n],e[n+1]||e[0])}return t},getFirstCurve:function(){return this.getCurves()[0]},getLastCurve:function(){var t=this.getCurves();return t[t.length-1]},isClosed:function(){return this._closed},setClosed:function(t){if(this._closed!=(t=!!t)){if(this._closed=t,this._curves){var e=this._curves.length=this._countCurves();t&&(this._curves[e-1]=new k(this,this._segments[e-1],this._segments[0]))}this._changed(25)}}},{beans:!0,getPathData:function(t,e){function i(e,i){if(e._transformCoordinates(t,g),n=g[0],r=g[1],v)p.push("M"+_.pair(n,r)),v=!1;else if(o=g[2],u=g[3],o===n&&u===r&&l===s&&c===a){if(!i){var h=n-s,f=r-a;p.push(0===h?"v"+_.number(f):0===f?"h"+_.number(h):"l"+_.pair(h,f))}}else p.push("c"+_.pair(l-s,c-a)+" "+_.pair(o-s,u-a)+" "+_.pair(n-s,r-a));s=n,a=r,l=g[4],c=g[5]}var n,r,s,a,o,u,l,c,f=this._segments,d=f.length,_=new h(e),g=new Array(6),v=!0,p=[];if(!d)return"";for(var m=0;m<d;m++)i(f[m]);return this._closed&&d>0&&(i(f[0],!0),p.push("z")),p.join("")},isEmpty:function(){return!this._segments.length},_transformContent:function(t){for(var e=this._segments,i=new Array(6),n=0,r=e.length;n<r;n++)e[n]._transformCoordinates(t,i,!0);return!0},_add:function(t,e){for(var i=this._segments,n=this._curves,r=t.length,s=null==e,e=s?i.length:e,a=0;a<r;a++){var o=t[a];o._path&&(o=t[a]=o.clone()),o._path=this,o._index=e+a,o._selection&&this._updateSelection(o,0,o._selection)}if(s)i.push.apply(i,t);else{i.splice.apply(i,[e,0].concat(t));for(var a=e+r,h=i.length;a<h;a++)i[a]._index=a}if(n){var u=this._countCurves(),l=e>0&&e+r-1===u?e-1:e,c=l,f=Math.min(l+r,u);t._curves&&(n.splice.apply(n,[l,0].concat(t._curves)),c+=t._curves.length);for(a=c;a<f;a++)n.splice(a,0,new k(this,null,null));this._adjustCurves(l,f)}return this._changed(25),t},_adjustCurves:function(t,e){for(var i,n=this._segments,r=this._curves,s=t;s<e;s++)(i=r[s])._path=this,i._segment1=n[s],i._segment2=n[s+1]||n[0],i._changed();(i=r[this._closed&&!t?n.length-1:t-1])&&(i._segment2=n[t]||n[0],i._changed()),(i=r[e])&&(i._segment1=n[e],i._changed())},_countCurves:function(){var t=this._segments.length;return!this._closed&&t>0?t-1:t},add:function(t){return arguments.length>1&&"number"!=typeof t?this._add(T.readList(arguments)):this._add([T.read(arguments)])[0]},insert:function(t,e){return arguments.length>2&&"number"!=typeof e?this._add(T.readList(arguments,1),t):this._add([T.read(arguments,1)],t)[0]},addSegment:function(){return this._add([T.read(arguments)])[0]},insertSegment:function(t){return this._add([T.read(arguments,1)],t)[0]},addSegments:function(t){return this._add(T.readList(t))},insertSegments:function(t,e){return this._add(T.readList(e),t)},removeSegment:function(t){return this.removeSegments(t,t+1)[0]||null},removeSegments:function(t,e,i){t=t||0,e=r.pick(e,this._segments.length);var n=this._segments,s=this._curves,a=n.length,o=n.splice(t,e-t),h=o.length;if(!h)return o;for(l=0;l<h;l++){var u=o[l];u._selection&&this._updateSelection(u,u._selection,0),u._index=u._path=null}for(var l=t,c=n.length;l<c;l++)n[l]._index=l;if(s){for(var f=t>0&&e===a+(this._closed?1:0)?t-1:t,l=(s=s.splice(f,h)).length-1;l>=0;l--)s[l]._path=null;i&&(o._curves=s.slice(1)),this._adjustCurves(f,f)}return this._changed(25),o},clear:"#removeSegments",hasHandles:function(){for(var t=this._segments,e=0,i=t.length;e<i;e++)if(t[e].hasHandles())return!0;return!1},clearHandles:function(){for(var t=this._segments,e=0,i=t.length;e<i;e++)t[e].clearHandles()},getLength:function(){if(null==this._length){for(var t=this.getCurves(),e=0,i=0,n=t.length;i<n;i++)e+=t[i].getLength();this._length=e}return this._length},getArea:function(){var t=this._area;if(null==t){var e=this._segments,i=this._closed;t=0;for(var n=0,r=e.length;n<r;n++){var s=n+1===r;t+=k.getArea(k.getValues(e[n],e[s?0:n+1],null,s&&!i))}this._area=t}return t},isFullySelected:function(){var t=this._segments.length;return this.isSelected()&&t>0&&this._segmentSelection===7*t},setFullySelected:function(t){t&&this._selectSegments(!0),this.setSelected(t)},setSelection:function t(e){1&e||this._selectSegments(!1),t.base.call(this,e)},_selectSegments:function(t){var e=this._segments,i=e.length,n=t?7:0;this._segmentSelection=n*i;for(var r=0;r<i;r++)e[r]._selection=n},_updateSelection:function(t,e,i){t._selection=i,(this._segmentSelection+=i-e)>0&&this.setSelected(!0)},divideAt:function(t){var e,i=this.getLocationAt(t);return i&&(e=i.getCurve().divideAt(i.getCurveOffset()))?e._segment1:null},splitAt:function(t){var e=this.getLocationAt(t),i=e&&e.index,n=e&&e.time;n>1-1e-8&&(i++,n=0);var r=this.getCurves();if(i>=0&&i<r.length){n>=1e-8&&r[i++].divideAtTime(n);var s,a=this.removeSegments(i,this._segments.length,!0);return this._closed?(this.setClosed(!1),s=this):((s=new L(w.NO_INSERT)).insertAbove(this),s.copyAttributes(this)),s._add(a,0),this.addSegment(a[0]),s}return null},split:function(t,i){var n,r=i===e?t:(n=this.getCurves()[t])&&n.getLocationAtTime(i);return null!=r?this.splitAt(r):null},join:function(t,e){var i=e||0;if(t&&t!==this){var n=t._segments,r=this.getLastSegment(),s=t.getLastSegment();if(!s)return this;r&&r._point.isClose(s._point,i)&&t.reverse();var a=t.getFirstSegment();if(r&&r._point.isClose(a._point,i))r.setHandleOut(a._handleOut),this._add(n.slice(1));else{var o=this.getFirstSegment();o&&o._point.isClose(a._point,i)&&t.reverse(),s=t.getLastSegment(),o&&o._point.isClose(s._point,i)?(o.setHandleIn(s._handleIn),this._add(n.slice(0,n.length-1),0)):this._add(n.slice())}t._closed&&this._add([n[0]]),t.remove()}var h=this.getFirstSegment(),u=this.getLastSegment();return h!==u&&h._point.isClose(u._point,i)&&(h.setHandleIn(u._handleIn),u.remove(),this.setClosed(!0)),this},reduce:function(t){for(var e=this.getCurves(),i=t&&t.simplify,n=i?1e-7:0,r=e.length-1;r>=0;r--){var s=e[r];!s.hasHandles()&&(!s.hasLength(n)||i&&s.isCollinear(s.getNext()))&&s.remove()}return this},reverse:function(){this._segments.reverse();for(var t=0,e=this._segments.length;t<e;t++){var i=this._segments[t],n=i._handleIn;i._handleIn=i._handleOut,i._handleOut=n,i._index=t}this._curves=null,this._changed(9)},flatten:function(t){for(var e=new B(this,t||.25,256,!0).parts,i=e.length,n=[],r=0;r<i;r++)n.push(new T(e[r].curve.slice(0,2)));!this._closed&&i>0&&n.push(new T(e[i-1].curve.slice(6))),this.setSegments(n)},simplify:function(t){var e=new D(this).fit(t||2.5);return e&&this.setSegments(e),!!e},smooth:function(t){function i(t,e){var i=t&&t.index;if(null!=i){var r=t.path;if(r&&r!==n)throw new Error(t._class+" "+i+" of "+r+" is not part of "+n);e&&t instanceof k&&i++}else i="number"==typeof t?t:e;return Math.min(i<0&&h?i%o:i<0?i+o:i,o-1)}var n=this,r=t||{},s=r.type||"asymmetric",a=this._segments,o=a.length,h=this._closed,u=h&&r.from===e&&r.to===e,l=i(r.from,0),c=i(r.to,o-1);if(l>c)if(h)l-=o;else{var f=l;l=c,c=f}if(/^(?:asymmetric|continuous)$/.test(s)){var d="asymmetric"===s,_=Math.min,g=c-l+1,v=g-1,p=u?_(g,4):1,m=p,y=p,w=[];if(h||(m=_(1,l),y=_(1,o-c-1)),(v+=m+y)<=1)return;for(var x=0,b=l-m;x<=v;x++,b++)w[x]=a[(b<0?b+o:b)%o]._point;for(var C=w[0]._x+2*w[1]._x,S=w[0]._y+2*w[1]._y,P=2,I=v-1,M=[C],T=[S],z=[P],O=[],A=[],x=1;x<v;x++){var L=x<I,N=L?1:d?1:2,B=L?4:d?2:7,D=L?4:d?3:8,j=L?2:d?0:1,E=N/P;P=z[x]=B-E,C=M[x]=D*w[x]._x+j*w[x+1]._x-E*C,S=T[x]=D*w[x]._y+j*w[x+1]._y-E*S}O[I]=M[I]/z[I],A[I]=T[I]/z[I];for(x=v-2;x>=0;x--)O[x]=(M[x]-O[x+1])/z[x],A[x]=(T[x]-A[x+1])/z[x];O[v]=(3*w[v]._x-O[I])/2,A[v]=(3*w[v]._y-A[I])/2;for(var x=m,F=v-y,b=l;x<=F;x++,b++){var R=a[b<0?b+o:b],q=R._point,V=O[x]-q._x,H=A[x]-q._y;(u||x<F)&&R.setHandleOut(V,H),(u||x>m)&&R.setHandleIn(-V,-H)}}else for(x=l;x<=c;x++)a[x<0?x+o:x].smooth(r,!u&&x===l,!u&&x===c)},toShape:function(t){function i(t,e){var i=l[t],n=i.getNext(),r=l[e],s=r.getNext();return i._handleOut.isZero()&&n._handleIn.isZero()&&r._handleOut.isZero()&&s._handleIn.isZero()&&n._point.subtract(i._point).isCollinear(s._point.subtract(r._point))}function n(t){var e=l[t],i=e.getNext(),n=e._handleOut,r=i._handleIn;if(n.isOrthogonal(r)){var s=e._point,a=i._point,o=new m(s,n,!0).intersect(new m(a,r,!0),!0);return o&&u.isZero(n.getLength()/o.subtract(s).getLength()-.5522847498307936)&&u.isZero(r.getLength()/o.subtract(a).getLength()-.5522847498307936)}return!1}function r(t,e){return l[t]._point.getDistance(l[e]._point)}if(!this._closed)return null;var s,a,o,h,l=this._segments;if(!this.hasHandles()&&4===l.length&&i(0,2)&&i(1,3)&&function(t){var e=l[t],i=e.getPrevious(),n=e.getNext();return i._handleOut.isZero()&&e._handleIn.isZero()&&e._handleOut.isZero()&&n._handleIn.isZero()&&e._point.subtract(i._point).isOrthogonal(n._point.subtract(e._point))}(1)?(s=C.Rectangle,a=new d(r(0,3),r(0,1)),h=l[1]._point.add(l[2]._point).divide(2)):8===l.length&&n(0)&&n(2)&&n(4)&&n(6)&&i(1,5)&&i(3,7)?(s=C.Rectangle,o=(a=new d(r(1,6),r(0,3))).subtract(new d(r(0,7),r(1,2))).divide(2),h=l[3]._point.add(l[4]._point).divide(2)):4===l.length&&n(0)&&n(1)&&n(2)&&n(3)&&(u.isZero(r(0,2)-r(1,3))?(s=C.Circle,o=r(0,2)/2):(s=C.Ellipse,o=new d(r(2,0)/2,r(3,1)/2)),h=l[1]._point),s){var c=this.getPosition(!0),f=new s({center:c,size:a,radius:o,insert:!1});return f.copyAttributes(this,!0),f._matrix.prepend(this._matrix),f.rotate(h.subtract(c).getAngle()+90),(t===e||t)&&f.insertAbove(this),f}return null},toPath:"#clone",compare:function t(e){if(!e||e instanceof N)return t.base.call(this,e);var i=this.getCurves(),n=e.getCurves(),r=i.length,s=n.length;if(!r||!s)return r==s;for(var a,o,h=i[0].getValues(),u=[],l=0,c=0,f=0;f<s;f++){g=n[f].getValues();if(u.push(g),v=k.getOverlaps(h,g)){a=!f&&v[0][0]>0?s-1:f,o=v[0][1];break}}for(var d,_=Math.abs,g=u[a];h&&g;){var v=k.getOverlaps(h,g);if(v&&_(v[0][0]-c)<1e-8){1===(c=v[1][0])&&(h=++l<r?i[l].getValues():null,c=0);var p=v[0][1];if(_(p-o)<1e-8){if(d||(d=[a,p]),1===(o=v[1][1])&&(++a>=s&&(a=0),g=u[a]||n[a].getValues(),o=0),!h)return d[0]===a&&d[1]===o;continue}}break}return!1},_hitTestSelf:function(t,e,i,n){function r(e,i){return t.subtract(e).divide(i).length<=1}function s(t,i,n){if(!e.selected||i.isSelected()){var s=t._point;if(i!==s&&(i=i.add(s)),r(i,x))return new M(n,g,{segment:t,point:i})}}function a(t,i){return(i||e.segments)&&s(t,t._point,"segment")||!i&&e.handles&&(s(t,t._handleIn,"handle-in")||s(t,t._handleOut,"handle-out"))}function o(t){f.add(t)}function h(e){var i=y||e._index>0&&e._index<m-1;if("round"===(i?u:l))return r(e._point,x);if(f=new L({internal:!0,closed:!0}),i?e.isSmooth()||L._addBevelJoin(e,u,P,c,null,n,o,!0):"square"===l&&L._addSquareCap(e,l,P,null,n,o,!0),!f.isEmpty()){var s;return f.contains(t)||(s=f.getNearestLocation(t))&&r(s.getPoint(),w)}}var u,l,c,f,d,_,g=this,v=this.getStyle(),p=this._segments,m=p.length,y=this._closed,w=e._tolerancePadding,x=w,b=e.stroke&&v.hasStroke(),C=e.fill&&v.hasFill(),S=e.curves,P=b?v.getStrokeWidth()/2:C&&e.tolerance>0||S?0:null;if(null!==P&&(P>0?(u=v.getStrokeJoin(),l=v.getStrokeCap(),c=v.getMiterLimit(),x=x.add(L._getStrokePadding(P,n))):u=l="round"),!e.ends||e.segments||y){if(e.segments||e.handles)for(T=0;T<m;T++)if(_=a(p[T]))return _}else if(_=a(p[0],!0)||a(p[m-1],!0))return _;if(null!==P){if(d=this.getNearestLocation(t)){var I=d.getTime();0===I||1===I&&m>1?h(d.getSegment())||(d=null):r(d.getPoint(),x)||(d=null)}if(!d&&"miter"===u&&m>1)for(var T=0;T<m;T++){var z=p[T];if(t.getDistance(z._point)<=c*P&&h(z)){d=z.getLocation();break}}}return!d&&C&&this._contains(t)||d&&!b&&!S?new M("fill",this):d?new M(b?"stroke":"curve",this,{location:d,point:d.getPoint()}):null}},r.each(k._evaluateMethods,function(t){this[t+"At"]=function(e){var i=this.getLocationAt(e);return i&&i[t]()}},{beans:!1,getLocationOf:function(){for(var t=c.read(arguments),e=this.getCurves(),i=0,n=e.length;i<n;i++){var r=e[i].getLocationOf(t);if(r)return r}return null},getOffsetOf:function(){var t=this.getLocationOf.apply(this,arguments);return t?t.getOffset():null},getLocationAt:function(t){if("number"==typeof t){for(var e=this.getCurves(),i=0,n=0,r=e.length;n<r;n++){var s=i,a=e[n];if((i+=a.getLength())>t)return a.getLocationAt(t-s)}if(e.length>0&&t<=this.getLength())return new O(e[e.length-1],1)}else if(t&&t.getPath&&t.getPath()===this)return t;return null}}),new function(){function t(t,e,i,n){function r(e){var i=h[e],n=h[e+1];s==i&&a==n||(t.beginPath(),t.moveTo(s,a),t.lineTo(i,n),t.stroke(),t.beginPath(),t.arc(i,n,o,0,2*Math.PI,!0),t.fill())}for(var s,a,o=n/2,h=new Array(6),u=0,l=e.length;u<l;u++){var c=e[u],f=c._selection;if(c._transformCoordinates(i,h),s=h[0],a=h[1],2&f&&r(2),4&f&&r(4),t.fillRect(s-o,a-o,n,n),!(1&f)){var d=t.fillStyle;t.fillStyle="#ffffff",t.fillRect(s-o+1,a-o+1,n-2,n-2),t.fillStyle=d}}}function e(t,e,i){function n(e){if(i)e._transformCoordinates(i,_),r=_[0],s=_[1];else{var n=e._point;r=n._x,s=n._y}if(g)t.moveTo(r,s),g=!1;else{if(i)h=_[2],u=_[3];else{f=e._handleIn;h=r+f._x,u=s+f._y}h===r&&u===s&&l===a&&c===o?t.lineTo(r,s):t.bezierCurveTo(l,c,h,u,r,s)}if(a=r,o=s,i)l=_[4],c=_[5];else{var f=e._handleOut;l=a+f._x,c=o+f._y}}for(var r,s,a,o,h,u,l,c,f=e._segments,d=f.length,_=new Array(6),g=!0,v=0;v<d;v++)n(f[v]);e._closed&&d>0&&n(f[0])}return{_draw:function(t,i,n,r){function s(t){return c[(t%f+f)%f]}var a=i.dontStart,o=i.dontFinish||i.clip,h=this.getStyle(),u=h.hasFill(),l=h.hasStroke(),c=h.getDashArray(),f=!paper.support.nativeDash&&l&&c&&c.length;if(a||t.beginPath(),(u||l&&!f||o)&&(e(t,this,r),this._closed&&t.closePath()),!o&&(u||l)&&(this._setStyles(t,i,n),u&&(t.fill(h.getFillRule()),t.shadowColor="rgba(0,0,0,0)"),l)){if(f){a||t.beginPath();var d,_=new B(this,.25,32,!1,r),g=_.length,v=-h.getDashOffset(),p=0;for(v%=g;v>0;)v-=s(p--)+s(p--);for(;v<g;)d=v+s(p++),(v>0||d>0)&&_.drawPart(t,Math.max(v,0),Math.max(d,0)),v=d+s(p++)}t.stroke()}},_drawSelected:function(i,n){i.beginPath(),e(i,this,n),i.stroke(),t(i,this._segments,n,paper.settings.handleSize)}}},new function(){function t(t){var e=t._segments;if(!e.length)throw new Error("Use a moveTo() command first");return e[e.length-1]}return{moveTo:function(){var t=this._segments;1===t.length&&this.removeSegment(0),t.length||this._add([new T(c.read(arguments))])},moveBy:function(){throw new Error("moveBy() is unsupported on Path items.")},lineTo:function(){this._add([new T(c.read(arguments))])},cubicCurveTo:function(){var e=c.read(arguments),i=c.read(arguments),n=c.read(arguments),r=t(this);r.setHandleOut(e.subtract(r._point)),this._add([new T(n,i.subtract(n))])},quadraticCurveTo:function(){var e=c.read(arguments),i=c.read(arguments),n=t(this)._point;this.cubicCurveTo(e.add(n.subtract(e).multiply(1/3)),e.add(i.subtract(e).multiply(1/3)),i)},curveTo:function(){var e=c.read(arguments),i=c.read(arguments),n=r.pick(r.read(arguments),.5),s=1-n,a=t(this)._point,o=e.subtract(a.multiply(s*s)).subtract(i.multiply(n*n)).divide(2*n*s);if(o.isNaN())throw new Error("Cannot put a curve through points with parameter = "+n);this.quadraticCurveTo(o,i)},arcTo:function(){var e,i,n,s,a=Math.abs,o=Math.sqrt,h=t(this),l=h._point,f=c.read(arguments),_=r.peek(arguments);if("boolean"==typeof(x=r.pick(_,!0)))var g=(C=l.add(f).divide(2)).add(C.subtract(l).rotate(x?-90:90));else if(r.remain(arguments)<=2)g=f,f=c.read(arguments);else{var v=d.read(arguments),y=u.isZero;if(y(v.width)||y(v.height))return this.lineTo(f);var w=r.read(arguments),x=!!r.read(arguments),b=!!r.read(arguments),C=l.add(f).divide(2),S=(W=l.subtract(C).rotate(-w)).x,P=W.y,I=a(v.width),M=a(v.height),z=I*I,k=M*M,O=S*S,A=P*P,L=o(O/z+A/k);if(L>1&&(z=(I*=L)*I,k=(M*=L)*M),L=(z*k-z*A-k*O)/(z*A+k*O),a(L)<1e-12&&(L=0),L<0)throw new Error("Cannot create an arc with the given arguments");e=new c(I*P/M,-M*S/I).multiply((b===x?-1:1)*o(L)).rotate(w).add(C),i=(n=(s=(new p).translate(e).rotate(w).scale(I,M))._inverseTransform(l)).getDirectedAngle(s._inverseTransform(f)),!x&&i>0?i-=360:x&&i<0&&(i+=360)}if(g){var N=new m(l.add(g).divide(2),g.subtract(l).rotate(90),!0),B=new m(g.add(f).divide(2),f.subtract(g).rotate(90),!0),D=new m(l,f),j=D.getSide(g);if(!(e=N.intersect(B,!0))){if(!j)return this.lineTo(f);throw new Error("Cannot create an arc with the given arguments")}i=(n=l.subtract(e)).getDirectedAngle(f.subtract(e));var E=D.getSide(e);0===E?i=j*a(i):j===E&&(i+=i<0?360:-360)}for(var F=a(i),R=F>=360?4:Math.ceil((F-1e-7)/90),q=i/R,V=q*Math.PI/360,H=4/3*Math.sin(V)/(1+Math.cos(V)),Z=[],U=0;U<=R;U++){var W=f,G=null;if(U<R&&(G=n.rotate(90).multiply(H),s?(W=s._transformPoint(n),G=s._transformPoint(n.add(G)).subtract(W)):W=e.add(n)),U){var J=n.rotate(-90).multiply(H);s&&(J=s._transformPoint(n.add(J)).subtract(W)),Z.push(new T(W,J,G))}else h.setHandleOut(G);n=n.rotate(q)}this._add(Z)},lineBy:function(){var e=c.read(arguments),i=t(this)._point;this.lineTo(i.add(e))},curveBy:function(){var e=c.read(arguments),i=c.read(arguments),n=r.read(arguments),s=t(this)._point;this.curveTo(s.add(e),s.add(i),n)},cubicCurveBy:function(){var e=c.read(arguments),i=c.read(arguments),n=c.read(arguments),r=t(this)._point;this.cubicCurveTo(r.add(e),r.add(i),r.add(n))},quadraticCurveBy:function(){var e=c.read(arguments),i=c.read(arguments),n=t(this)._point;this.quadraticCurveTo(n.add(e),n.add(i))},arcBy:function(){var e=t(this)._point,i=e.add(c.read(arguments)),n=r.pick(r.peek(arguments),!0);"boolean"==typeof n?this.arcTo(i,n):this.arcTo(i,e.add(c.read(arguments)))},closePath:function(t){this.setClosed(!0),this.join(this,t)}}},{_getBounds:function(t,e){var i=e.handle?"getHandleBounds":e.stroke?"getStrokeBounds":"getBounds";return L[i](this._segments,this._closed,this,t,e)},statics:{getBounds:function(t,e,i,n,r,s){function a(t){t._transformCoordinates(n,h);for(var e=0;e<2;e++)k._addBounds(u[e],u[e+4],h[e+2],h[e],e,s?s[e]:0,l,c,f);var i=u;u=h,h=i}var o=t[0];if(!o)return new g;for(var h=new Array(6),u=o._transformCoordinates(n,new Array(6)),l=u.slice(0,2),c=l.slice(),f=new Array(2),d=1,_=t.length;d<_;d++)a(t[d]);return e&&a(o),new g(l[0],l[1],c[0]-l[0],c[1]-l[1])},getStrokeBounds:function(t,e,i,n,r){function s(t){v=v.include(t)}function a(t){v=v.unite(x.setCenter(t._point.transform(n)))}function o(t,e){"round"===e||t.isSmooth()?a(t):L._addBevelJoin(t,e,p,w,n,f,s)}function h(t,e){"round"===e?a(t):L._addSquareCap(t,e,p,n,f,s)}var u=i.getStyle(),l=u.hasStroke(),c=u.getStrokeWidth(),f=l&&i._getStrokeMatrix(n,r),_=l&&L._getStrokePadding(c,f),v=L.getBounds(t,e,i,n,r,_);if(!l)return v;for(var p=c/2,m=u.getStrokeJoin(),y=u.getStrokeCap(),w=u.getMiterLimit(),x=new g(new d(_)),b=t.length-(e?0:1),C=1;C<b;C++)o(t[C],m);return e?o(t[0],m):b>0&&(h(t[0],y),h(t[t.length-1],y)),v},_getStrokePadding:function(t,e){if(!e)return[t,t];var i=new c(t,0).transform(e),n=new c(0,t).transform(e),r=i.getAngleInRadians(),s=i.getLength(),a=n.getLength(),o=Math.sin(r),h=Math.cos(r),u=Math.tan(r),l=Math.atan2(a*u,s),f=Math.atan2(a,u*s);return[Math.abs(s*Math.cos(l)*h+a*Math.sin(l)*o),Math.abs(a*Math.sin(f)*h+s*Math.cos(f)*o)]},_addBevelJoin:function(t,e,i,n,r,s,a,o){var h=t.getCurve(),u=h.getPrevious(),l=h.getPoint1().transform(r),f=u.getNormalAtTime(1).multiply(i).transform(s),d=h.getNormalAtTime(0).multiply(i).transform(s);if(f.getDirectedAngle(d)<0&&(f=f.negate(),d=d.negate()),o&&a(l),a(l.add(f)),"miter"===e){var _=new m(l.add(f),new c(-f.y,f.x),!0).intersect(new m(l.add(d),new c(-d.y,d.x),!0),!0);_&&l.getDistance(_)<=n*i&&a(_)}a(l.add(d))},_addSquareCap:function(t,e,i,n,r,s,a){var o=t._point.transform(n),h=t.getLocation(),u=h.getNormal().multiply(0===h.getTime()?i:-i).transform(r);"square"===e&&(a&&(s(o.subtract(u)),s(o.add(u))),o=o.add(u.rotate(-90))),s(o.add(u)),s(o.subtract(u))},getHandleBounds:function(t,e,i,n,r){var s,a,o=i.getStyle();if(r.stroke&&o.hasStroke()){var h=i._getStrokeMatrix(n,r),u=o.getStrokeWidth()/2,l=u;"miter"===o.getStrokeJoin()&&(l=u*o.getMiterLimit()),"square"===o.getStrokeCap()&&(l=Math.max(l,u*Math.SQRT2)),s=L._getStrokePadding(u,h),a=L._getStrokePadding(l,h)}for(var c=new Array(6),f=1/0,d=-f,_=f,v=d,p=0,m=t.length;p<m;p++){t[p]._transformCoordinates(n,c);for(var y=0;y<6;y+=2){var w=y?s:a,x=w?w[0]:0,b=w?w[1]:0,C=c[y],S=c[y+1],P=C-x,I=C+x,M=S-b,T=S+b;P<f&&(f=P),I>d&&(d=I),M<_&&(_=M),T>v&&(v=T)}}return new g(f,_,d-f,v-_)}}});L.inject({statics:new function(){function t(t,e,i){var n=r.getNamed(i),s=new L(n&&0==n.insert&&w.NO_INSERT);return s._add(t),s._closed=e,s.set(n,{insert:!0})}function e(e,i,r){for(var s=new Array(4),a=0;a<4;a++){var o=n[a];s[a]=new T(o._point.multiply(i).add(e),o._handleIn.multiply(i),o._handleOut.multiply(i))}return t(s,!0,r)}var i=.5522847498307936,n=[new T([-1,0],[0,i],[0,-i]),new T([0,-1],[-i,0],[i,0]),new T([1,0],[0,-i],[0,i]),new T([0,1],[i,0],[-i,0])];return{Line:function(){return t([new T(c.readNamed(arguments,"from")),new T(c.readNamed(arguments,"to"))],!1,arguments)},Circle:function(){var t=c.readNamed(arguments,"center"),i=r.readNamed(arguments,"radius");return e(t,new d(i),arguments)},Rectangle:function(){var e,n=g.readNamed(arguments,"rectangle"),r=d.readNamed(arguments,"radius",0,{readNull:!0}),s=n.getBottomLeft(!0),a=n.getTopLeft(!0),o=n.getTopRight(!0),h=n.getBottomRight(!0);if(!r||r.isZero())e=[new T(s),new T(a),new T(o),new T(h)];else{var u=(r=d.min(r,n.getSize(!0).divide(2))).width,l=r.height,c=u*i,f=l*i;e=[new T(s.add(u,0),null,[-c,0]),new T(s.subtract(0,l),[0,f]),new T(a.add(0,l),null,[0,-f]),new T(a.add(u,0),[-c,0],null),new T(o.subtract(u,0),null,[c,0]),new T(o.add(0,l),[0,-f],null),new T(h.subtract(0,l),null,[0,f]),new T(h.subtract(u,0),[c,0])]}return t(e,!0,arguments)},RoundRectangle:"#Rectangle",Ellipse:function(){var t=C._readEllipse(arguments);return e(t.center,t.radius,arguments)},Oval:"#Ellipse",Arc:function(){var t=c.readNamed(arguments,"from"),e=c.readNamed(arguments,"through"),i=c.readNamed(arguments,"to"),n=r.getNamed(arguments),s=new L(n&&0==n.insert&&w.NO_INSERT);return s.moveTo(t),s.arcTo(e,i),s.set(n)},RegularPolygon:function(){for(var e=c.readNamed(arguments,"center"),i=r.readNamed(arguments,"sides"),n=r.readNamed(arguments,"radius"),s=360/i,a=i%3==0,o=new c(0,a?-n:n),h=a?-1:.5,u=new Array(i),l=0;l<i;l++)u[l]=new T(e.add(o.rotate((l+h)*s)));return t(u,!0,arguments)},Star:function(){for(var e=c.readNamed(arguments,"center"),i=2*r.readNamed(arguments,"points"),n=r.readNamed(arguments,"radius1"),s=r.readNamed(arguments,"radius2"),a=360/i,o=new c(0,-1),h=new Array(i),u=0;u<i;u++)h[u]=new T(e.add(o.rotate(a*u).multiply(u%2?s:n)));return t(h,!0,arguments)}}}});var N=A.extend({_class:"CompoundPath",_serializeFields:{children:[]},beans:!0,initialize:function(t){this._children=[],this._namedChildren={},this._initialize(t)||("string"==typeof t?this.setPathData(t):this.addChildren(Array.isArray(t)?t:arguments))},insertChildren:function t(e,i){var n=i,s=n[0];s&&"number"==typeof s[0]&&(n=[n]);for(var a=i.length-1;a>=0;a--){var o=n[a];n!==i||o instanceof L||(n=r.slice(n)),Array.isArray(o)?n[a]=new L({segments:o,insert:!1}):o instanceof N&&(n.splice.apply(n,[a,1].concat(o.removeChildren())),o.remove())}return t.base.call(this,e,n)},reduce:function t(e){for(var i=this._children,n=i.length-1;n>=0;n--)(r=i[n].reduce(e)).isEmpty()&&r.remove();if(!i.length){var r=new L(w.NO_INSERT);return r.copyAttributes(this),r.insertAbove(this),this.remove(),r}return t.base.call(this)},isClosed:function(){for(var t=this._children,e=0,i=t.length;e<i;e++)if(!t[e]._closed)return!1;return!0},setClosed:function(t){for(var e=this._children,i=0,n=e.length;i<n;i++)e[i].setClosed(t)},getFirstSegment:function(){var t=this.getFirstChild();return t&&t.getFirstSegment()},getLastSegment:function(){var t=this.getLastChild();return t&&t.getLastSegment()},getCurves:function(){for(var t=this._children,e=[],i=0,n=t.length;i<n;i++)e.push.apply(e,t[i].getCurves());return e},getFirstCurve:function(){var t=this.getFirstChild();return t&&t.getFirstCurve()},getLastCurve:function(){var t=this.getLastChild();return t&&t.getLastCurve()},getArea:function(){for(var t=this._children,e=0,i=0,n=t.length;i<n;i++)e+=t[i].getArea();return e},getLength:function(){for(var t=this._children,e=0,i=0,n=t.length;i<n;i++)e+=t[i].getLength();return e},getPathData:function(t,e){for(var i=this._children,n=[],r=0,s=i.length;r<s;r++){var a=i[r],o=a._matrix;n.push(a.getPathData(t&&!o.isIdentity()?t.appended(o):t,e))}return n.join("")},_hitTestChildren:function t(e,i,n){return t.base.call(this,e,i.class===L||"path"===i.type?i:r.set({},i,{fill:!1}),n)},_draw:function(t,e,i,n){var r=this._children;if(r.length){e=e.extend({dontStart:!0,dontFinish:!0}),t.beginPath();for(var s=0,a=r.length;s<a;s++)r[s].draw(t,e,n);if(!e.clip){this._setStyles(t,e,i);var o=this._style;o.hasFill()&&(t.fill(o.getFillRule()),t.shadowColor="rgba(0,0,0,0)"),o.hasStroke()&&t.stroke()}}},_drawSelected:function(t,e,i){for(var n=this._children,r=0,s=n.length;r<s;r++){var a=n[r],o=a._matrix;i[a._id]||a._drawSelected(t,o.isIdentity()?e:e.appended(o))}}},new function(){function t(t,e){var i=t._children;if(e&&!i.length)throw new Error("Use a moveTo() command first");return i[i.length-1]}return r.each(["lineTo","cubicCurveTo","quadraticCurveTo","curveTo","arcTo","lineBy","cubicCurveBy","quadraticCurveBy","curveBy","arcBy"],function(e){this[e]=function(){var i=t(this,!0);i[e].apply(i,arguments)}},{moveTo:function(){var e=t(this),i=e&&e.isEmpty()?e:new L(w.NO_INSERT);i!==e&&this.addChild(i),i.moveTo.apply(i,arguments)},moveBy:function(){var e=t(this,!0),i=e&&e.getLastSegment(),n=c.read(arguments);this.moveTo(i?n.add(i._point):n)},closePath:function(e){t(this,!0).closePath(e)}})},r.each(["reverse","flatten","simplify","smooth"],function(t){this[t]=function(e){for(var i,n=this._children,r=0,s=n.length;r<s;r++)i=n[r][t](e)||i;return i}},{}));A.inject(new function(){function t(t,e){var i=t.clone(!1).reduce({simplify:!0}).transform(null,!0,!0);return e?i.resolveCrossings().reorient("nonzero"===i.getFillRule(),!0):i}function i(t,e,i,n,r){var s=new N(w.NO_INSERT);return s.addChildren(t,!0),s=s.reduce({simplify:e}),r&&0==r.insert||s.insertAbove(n&&i.isSibling(n)&&i.getIndex()<n.getIndex()?n:i),s.copyAttributes(i,!0),s}function n(e,n,r,a){function o(t){for(var e=0,i=t.length;e<i;e++){var n=t[e];w.push.apply(w,n._segments),x.push.apply(x,n.getCurves()),n._overlapsOnly=!0}}if(a&&(0==a.trace||a.stroke)&&/^(subtract|intersect)$/.test(r))return s(e,n,r);var u=t(e,!0),c=n&&e!==n&&t(n,!0),_=p[r];_[r]=!0,c&&(_.subtract||_.exclude)^c.isClockwise()^u.isClockwise()&&c.reverse();var g,v=l(O.expand(u.getCrossings(c))),m=u._children||[u],y=c&&(c._children||[c]),w=[],x=[];if(v.length){o(m),y&&o(y);for(var b=0,C=v.length;b<C;b++)f(v[b]._segment,u,c,x,_);for(var b=0,C=w.length;b<C;b++){var S=w[b],P=S._intersection;S._winding||f(S,u,c,x,_),P&&P._overlap||(S._path._overlapsOnly=!1)}g=d(w,_)}else g=h(y?m.concat(y):m.slice(),function(t){return!!_[t]});return i(g,!0,e,n,a)}function s(e,n,r){function s(t){if(!c[t._id]&&(l||o.contains(t.getPointAt(t.getLength()/2))^u))return f.unshift(t),c[t._id]=!0}for(var a=t(e),o=t(n),h=a.getCrossings(o),u="subtract"===r,l="divide"===r,c={},f=[],d=h.length-1;d>=0;d--){var _=h[d].split();_&&(s(_)&&_.getFirstSegment().setHandleIn(0,0),a.getLastSegment().setHandleOut(0,0))}return s(a),i(f,!1,e,n)}function a(t,e){for(var i=t;i;){if(i===e)return;i=i._previous}for(;t._next&&t._next!==e;)t=t._next;if(!t._next){for(;e._previous;)e=e._previous;t._next=e,e._previous=t}}function o(t){for(var e=t.length-1;e>=0;e--)t[e].clearHandles()}function h(t,e,i){var n=t&&t.length;if(n){var s=r.each(t,function(t,e){this[t._id]={container:null,winding:t.isClockwise()?1:-1,index:e}},{}),a=t.slice().sort(function(t,e){return v(e.getArea())-v(t.getArea())}),o=a[0];null==i&&(i=o.isClockwise());for(var h=0;h<n;h++){for(var u=a[h],l=s[u._id],c=u.getInteriorPoint(),f=0,d=h-1;d>=0;d--){var _=a[d];if(_.contains(c)){var g=s[_._id];f=g.winding,l.winding+=f,l.container=g.exclude?g.container:_;break}}if(e(l.winding)===e(f))l.exclude=!0,t[l.index]=null;else{var p=l.container;u.setClockwise(p?!p.isClockwise():i)}}}return t}function l(t,e,i){function n(t){return t._path._id+"."+t._segment1._index}for(var r,s,h,u=e&&[],l=!1,c=i||[],f=i&&{},d=(i&&i.length)-1;d>=0;d--)(y=i[d])._path&&(f[n(y)]=!0);for(d=t.length-1;d>=0;d--){var _,g=t[d],v=g._time,p=v,m=e&&!e(g),y=g._curve;if(y&&(y!==s?(l=!y.hasHandles()||f&&f[n(y)],r=[],h=null,s=y):h>=1e-8&&(v/=h)),m)r&&r.push(g);else{if(e&&u.unshift(g),h=p,v<1e-8)_=y._segment1;else if(v>1-1e-8)_=y._segment2;else{var w=y.divideAtTime(v,!0);l&&c.push(y,w),_=w._segment1;for(var x=r.length-1;x>=0;x--){var b=r[x];b._time=(b._time-v)/(1-v)}}g._setSegment(_);var C=_._intersection,S=g._intersection;if(C){a(C,S);for(var P=C;P;)a(P._intersection,C),P=P._next}else _._intersection=S}}return i||o(c),u||t}function c(t,e,i,n,r){function s(s){var a=s[l+0],h=s[l+6];if(!(p<_(a,h)||p>g(a,h))){var f=s[u+0],v=s[u+2],x=s[u+4],b=s[u+6];if(a!==h){var I=p===a?0:p===h?1:y>g(f,v,x,b)||w<_(f,v,x,b)?1:k.solveCubic(s,l,p,T,0,1)>0?T[0]:1,z=0===I?f:1===I?b:k.getPoint(s,I)[i?"y":"x"],O=a>h?1:-1,A=o[l]>o[l+6]?1:-1,L=o[u+6];return p!==a?(z<y?C+=O:z>w?S+=O:P=!0,z>d-m&&z<d+m&&(M/=2)):(O!==A?f<y?C+=O:f>w&&(S+=O):f!=L&&(L<w&&z>w?(S+=O,P=!0):L>y&&z<y&&(C+=O,P=!0)),M=0),o=s,!r&&z>y&&z<w&&0===k.getTangent(s,I)[i?"x":"y"]&&c(t,e,!i,n,!0)}(f<w&&b>y||b<w&&f>y)&&(P=!0)}}function a(t){var e=t[l+0],n=t[l+2],r=t[l+4],a=t[l+6];if(p<=g(e,n,r,a)&&p>=_(e,n,r,a))for(var o,h=t[u+0],c=t[u+2],f=t[u+4],d=t[u+6],v=y>g(h,c,f,d)||w<_(h,c,f,d)?[t]:k.getMonoCurves(t,i),m=0,x=v.length;m<x;m++)if(o=s(v[m]))return o}for(var o,h,u=i?1:0,l=1^u,f=[t.x,t.y],d=f[u],p=f[l],m=1e-6,y=d-1e-9,w=d+1e-9,x=0,b=0,C=0,S=0,P=!1,I=!1,M=1,T=[],z=0,O=e.length;z<O;z++){var A,L=e[z],N=L._path,B=L.getValues();if(!(z&&e[z-1]._path===N||(o=null,N._closed||(h=k.getValues(N.getLastCurve().getSegment2(),L.getSegment1(),null,!n))[l]!==h[l+6]&&(o=h),o))){o=B;for(var D=N.getLastCurve();D&&D!==L;){var j=D.getValues();if(j[l]!==j[l+6]){o=j;break}D=D.getPrevious()}}if(A=a(B))return A;if(z+1===O||e[z+1]._path!==N){if(h&&(A=a(h)))return A;!P||C||S||(C=S=N.isClockwise(n)^i?1:-1),x+=C,b+=S,C=S=0,P&&(I=!0,P=!1),h=null}}return x=v(x),b=v(b),{winding:g(x,b),windingL:x,windingR:b,quality:M,onPath:I}}function f(t,e,i,n,r){var s=[],a=t,o=0;do{d=(y=t.getCurve()).getLength();s.push({segment:t,curve:y,length:d}),o+=d,t=t.getNext()}while(t&&!t._intersection&&t!==a);for(var h=[.5,.25,.75],l={winding:0,quality:-1},f=0;f<h.length&&l.quality<.5;f++)for(var d=o*h[f],_=0,g=s.length;_<g;_++){var p=s[_],m=p.length;if(d<=m){var y=p.curve,w=y._path,x=w._parent,b=x instanceof N?x:w,C=u.clamp(y.getTimeAt(d),1e-8,1-1e-8),S=y.getPointAtTime(C),P=v(y.getTangentAtTime(C).y)<Math.SQRT1_2,I=r.subtract&&i&&(b===e&&i._getWinding(S,P,!0).winding||b===i&&!e._getWinding(S,P,!0).winding)?{winding:0,quality:1}:c(S,n,P,!0);I.quality>l.quality&&(l=I);break}d-=m}for(_=s.length-1;_>=0;_--)s[_].segment._winding=l}function d(t,e){function i(t){var i;return!(!t||t._visited||e&&(!e[(i=t._winding||{}).winding]||e.unite&&2===i.winding&&i.windingL&&i.windingR))}function n(t){if(t)for(var e=0,i=s.length;e<i;e++)if(t===s[e])return!0;return!1}function r(t){for(var e=t._segments,i=0,n=e.length;i<n;i++)e[i]._visited=!0}var s,a=[];t.sort(function(t,e){var i=t._intersection,n=e._intersection,r=!(!i||!i._overlap),s=!(!n||!n._overlap),a=t._path,o=e._path;return r^s?r?1:-1:!i^!n?i?1:-1:a!==o?a._id-o._id:t._index-e._index});for(var o=0,h=t.length;o<h;o++){var u,l,c,f=t[o],d=i(f),_=null,g=!1,v=!0,p=[];if(d&&f._path._overlapsOnly){var m=f._path,y=f._intersection._segment._path;m.compare(y)&&(m.getArea()&&a.push(m.clone(!1)),r(m),r(y),d=!1)}for(;d;){var x=!_,b=function(t,e){function r(r,a){for(;r&&r!==a;){var o=r._segment,u=o&&o._path;if(u){var l=o.getNext()||u.getFirstSegment(),c=l._intersection;o!==t&&(n(o)||n(l)||l&&i(o)&&(i(l)||c&&i(c._segment)))&&h.push(o),e&&s.push(o)}r=r._next}}var a=t._intersection,o=a,h=[];if(e&&(s=[t]),a){for(r(a);a&&a._prev;)a=a._prev;r(a,o)}return h}(f,x),C=b.shift(),S=!(g=!x&&(n(f)||n(C)))&&C;if(x&&(_=new L(w.NO_INSERT),u=null),g){(f.isFirst()||f.isLast())&&(v=f._path._closed),f._visited=!0;break}if(S&&u&&(p.push(u),u=null),u||(S&&b.push(f),u={start:_._segments.length,crossings:b,visited:l=[],handleIn:c}),S&&(f=C),!i(f)){_.removeSegments(u.start);for(var P=0,I=l.length;P<I;P++)l[P]._visited=!1;l.length=0;do{(f=u&&u.crossings.shift())&&f._path||(f=null,(u=p.pop())&&(l=u.visited,c=u.handleIn))}while(u&&!i(f));if(!f)break}var M=f.getNext();_.add(new T(f._point,c,M&&f._handleOut)),f._visited=!0,l.push(f),f=M||f._path.getFirstSegment(),c=M&&M._handleIn}g&&(v&&(_.getFirstSegment().setHandleIn(c),_.setClosed(v)),0!==_.getArea()&&a.push(_))}return a}var _=Math.min,g=Math.max,v=Math.abs,p={unite:{1:!0,2:!0},intersect:{2:!0},subtract:{1:!0},exclude:{1:!0,"-1":!0}};return{_getWinding:function(t,e,i){return c(t,this.getCurves(),e,i)},unite:function(t,e){return n(this,t,"unite",e)},intersect:function(t,e){return n(this,t,"intersect",e)},subtract:function(t,e){return n(this,t,"subtract",e)},exclude:function(t,e){return n(this,t,"exclude",e)},divide:function(t,e){return e&&(0==e.trace||e.stroke)?s(this,t,"divide"):i([this.subtract(t,e),this.intersect(t,e)],!0,this,t,e)},resolveCrossings:function(){function t(t,e){var i=t&&t._intersection;return i&&i._overlap&&i._path===e}var e=this._children,i=e||[this],n=!1,s=!1,a=this.getIntersections(null,function(t){return t.hasOverlap()&&(n=!0)||t.isCrossing()&&(s=!0)}),h=n&&s&&[];if(a=O.expand(a),n)for(var u=l(a,function(t){return t.hasOverlap()},h),c=u.length-1;c>=0;c--){var f=u[c],_=f._path,g=f._segment,v=g.getPrevious(),p=g.getNext();t(v,_)&&t(p,_)&&(g.remove(),v._handleOut._set(0,0),p._handleIn._set(0,0),v===g||v.getCurve().hasLength()||(p._handleIn.set(v._handleIn),v.remove()))}s&&(l(a,n&&function(t){var e=t.getCurve(),i=t.getSegment(),n=t._intersection,r=n._curve,s=n._segment;if(e&&r&&e._path&&r._path)return!0;i&&(i._intersection=null),s&&(s._intersection=null)},h),h&&o(h),i=d(r.each(i,function(t){this.push.apply(this,t._segments)},[])));var m,y=i.length;return y>1&&e?(i!==e&&this.setChildren(i),m=this):1!==y||e||(i[0]!==this&&this.setSegments(i[0].removeSegments()),m=this),m||((m=new N(w.NO_INSERT)).addChildren(i),(m=m.reduce()).copyAttributes(this),this.replaceWith(m)),m},reorient:function(t,i){var n=this._children;return n&&n.length?this.setChildren(h(this.removeChildren(),function(e){return!!(t?e:1&e)},i)):i!==e&&this.setClockwise(i),this},getInteriorPoint:function(){var t=this.getBounds().getCenter(!0);if(!this.contains(t)){for(var e=this.getCurves(),i=t.y,n=[],r=[],s=0,a=e.length;s<a;s++){var o=e[s].getValues(),h=o[1],u=o[3],l=o[5],c=o[7];if(i>=_(h,u,l,c)&&i<=g(h,u,l,c))for(var f=k.getMonoCurves(o),d=0,v=f.length;d<v;d++){var p=f[d],m=p[1],y=p[7];if(m!==y&&(i>=m&&i<=y||i>=y&&i<=m)){var w=i===m?p[0]:i===y?p[6]:1===k.solveCubic(p,1,i,r,0,1)?k.getPoint(p,r[0]).x:(p[0]+p[6])/2;n.push(w)}}}n.length>1&&(n.sort(function(t,e){return t-e}),t.x=(n[0]+n[1])/2)}return t}}});var B=r.extend({_class:"PathFlattener",initialize:function(t,e,i,n,r){function s(t,e){var i=k.getValues(t,e,r);h.push(i),a(i,t._index,0,1)}function a(t,i,r,s){if(!(s-r>c)||n&&k.isStraight(t)||k.isFlatEnough(t,e||.25)){var o=t[6]-t[0],h=t[7]-t[1],f=Math.sqrt(o*o+h*h);f>0&&(l+=f,u.push({offset:l,curve:t,index:i,time:s}))}else{var d=k.subdivide(t,.5),_=(r+s)/2;a(d[0],i,r,_),a(d[1],i,_,s)}}for(var o,h=[],u=[],l=0,c=1/(i||32),f=t._segments,d=f[0],_=1,g=f.length;_<g;_++)s(d,o=f[_]),d=o;t._closed&&s(o,f[0]),this.curves=h,this.parts=u,this.length=l,this.index=0},_get:function(t){for(var e,i=this.parts,n=i.length,r=this.index;e=r,r&&!(i[--r].offset<t););for(;e<n;e++){var s=i[e];if(s.offset>=t){this.index=e;var a=i[e-1],o=a&&a.index===s.index?a.time:0,h=a?a.offset:0;return{index:s.index,time:o+(s.time-o)*(t-h)/(s.offset-h)}}}return{index:i[n-1].index,time:1}},drawPart:function(t,e,i){for(var n=this._get(e),r=this._get(i),s=n.index,a=r.index;s<=a;s++){var o=k.getPart(this.curves[s],s===n.index?n.time:0,s===r.index?r.time:1);s===n.index&&t.moveTo(o[0],o[1]),t.bezierCurveTo.apply(t,o.slice(2))}}},r.each(k._evaluateMethods,function(t){this[t+"At"]=function(e){var i=this._get(e);return k[t](this.curves[i.index],i.time)}},{})),D=r.extend({initialize:function(t){for(var e,i=this.points=[],n=t._segments,r=t._closed,s=0,a=n.length;s<a;s++){var o=n[s].point;e&&e.equals(o)||i.push(e=o.clone())}r&&(i.unshift(i[i.length-1]),i.push(i[1])),this.closed=r},fit:function(t){var e=this.points,i=e.length,n=null;return i>0&&(n=[new T(e[0])],i>1&&(this.fitCubic(n,t,0,i-1,e[1].subtract(e[0]),e[i-2].subtract(e[i-1])),this.closed&&(n.shift(),n.pop()))),n},fitCubic:function(t,e,i,n,r,s){var a=this.points;if(n-i!=1){for(var o,h=this.chordLengthParameterize(i,n),u=Math.max(e,e*e),l=!0,c=0;c<=4;c++){var f=this.generateBezier(i,n,h,r,s),d=this.findMaxError(i,n,f,h);if(d.error<e&&l)return void this.addCurve(t,f);if(o=d.index,d.error>=u)break;l=this.reparameterize(i,n,h,f),u=d.error}var _=a[o-1].subtract(a[o+1]);this.fitCubic(t,e,i,o,r,_),this.fitCubic(t,e,o,n,_.negate(),s)}else{var g=a[i],v=a[n],p=g.getDistance(v)/3;this.addCurve(t,[g,g.add(r.normalize(p)),v.add(s.normalize(p)),v])}},addCurve:function(t,e){t[t.length-1].setHandleOut(e[1].subtract(e[0])),t.push(new T(e[3],e[2].subtract(e[3])))},generateBezier:function(t,e,i,n,r){for(var s=Math.abs,a=this.points,o=a[t],h=a[e],u=[[0,0],[0,0]],l=[0,0],c=0,f=e-t+1;c<f;c++){var d=i[c],_=1-d,g=3*d*_,v=_*_*_,p=g*_,m=g*d,y=d*d*d,w=n.normalize(p),x=r.normalize(m),b=a[t+c].subtract(o.multiply(v+p)).subtract(h.multiply(m+y));u[0][0]+=w.dot(w),u[0][1]+=w.dot(x),u[1][0]=u[0][1],u[1][1]+=x.dot(x),l[0]+=w.dot(b),l[1]+=x.dot(b)}var C,S,P=u[0][0]*u[1][1]-u[1][0]*u[0][1];if(s(P)>1e-12){var I=u[0][0]*l[1]-u[1][0]*l[0];C=(l[0]*u[1][1]-l[1]*u[0][1])/P,S=I/P}else{var M=u[0][0]+u[0][1],T=u[1][0]+u[1][1];C=S=s(M)>1e-12?l[0]/M:s(T)>1e-12?l[1]/T:0}var z,k,O=h.getDistance(o),A=1e-12*O;if(C<A||S<A)C=S=O/3;else{var L=h.subtract(o);z=n.normalize(C),k=r.normalize(S),z.dot(L)-k.dot(L)>O*O&&(C=S=O/3,z=k=null)}return[o,o.add(z||n.normalize(C)),h.add(k||r.normalize(S)),h]},reparameterize:function(t,e,i,n){for(r=t;r<=e;r++)i[r-t]=this.findRoot(n,this.points[r],i[r-t]);for(var r=1,s=i.length;r<s;r++)if(i[r]<=i[r-1])return!1;return!0},findRoot:function(t,e,i){for(var n=[],r=[],s=0;s<=2;s++)n[s]=t[s+1].subtract(t[s]).multiply(3);for(s=0;s<=1;s++)r[s]=n[s+1].subtract(n[s]).multiply(2);var a=this.evaluate(3,t,i),o=this.evaluate(2,n,i),h=this.evaluate(1,r,i),l=a.subtract(e),c=o.dot(o)+l.dot(h);return u.isZero(c)?i:i-l.dot(o)/c},evaluate:function(t,e,i){for(var n=e.slice(),r=1;r<=t;r++)for(var s=0;s<=t-r;s++)n[s]=n[s].multiply(1-i).add(n[s+1].multiply(i));return n[0]},chordLengthParameterize:function(t,e){for(var i=[0],n=t+1;n<=e;n++)i[n-t]=i[n-t-1]+this.points[n].getDistance(this.points[n-1]);for(var n=1,r=e-t;n<=r;n++)i[n]/=i[r];return i},findMaxError:function(t,e,i,n){for(var r=Math.floor((e-t+1)/2),s=0,a=t+1;a<e;a++){var o=this.evaluate(3,i,n[a-t]).subtract(this.points[a]),h=o.x*o.x+o.y*o.y;h>=s&&(s=h,r=a)}return{error:s,index:r}}}),j=w.extend({_class:"TextItem",_applyMatrix:!1,_canApplyMatrix:!1,_serializeFields:{content:null},_boundsOptions:{stroke:!1,handle:!1},initialize:function(t){this._content="",this._lines=[];var i=t&&r.isPlainObject(t)&&t.x===e&&t.y===e;this._initialize(i&&t,!i&&c.read(arguments))},_equals:function(t){return this._content===t._content},copyContent:function(t){this.setContent(t._content)},getContent:function(){return this._content},setContent:function(t){this._content=""+t,this._lines=this._content.split(/\r\n|\n|\r/gm),this._changed(265)},isEmpty:function(){return!this._content},getCharacterStyle:"#getStyle",setCharacterStyle:"#setStyle",getParagraphStyle:"#getStyle",setParagraphStyle:"#setStyle"}),E=j.extend({_class:"PointText",initialize:function(){j.apply(this,arguments)},getPoint:function(){var t=this._matrix.getTranslation();return new f(t.x,t.y,this,"setPoint")},setPoint:function(){var t=c.read(arguments);this.translate(t.subtract(this._matrix.getTranslation()))},_draw:function(t,e,i){if(this._content){this._setStyles(t,e,i);var n=this._lines,r=this._style,s=r.hasFill(),a=r.hasStroke(),o=r.getLeading(),h=t.shadowColor;t.font=r.getFontStyle(),t.textAlign=r.getJustification();for(var u=0,l=n.length;u<l;u++){t.shadowColor=h;var c=n[u];s&&(t.fillText(c,0,0),t.shadowColor="rgba(0,0,0,0)"),a&&t.strokeText(c,0,0),t.translate(0,o)}}},_getBounds:function(t,e){var i=this._style,n=this._lines,r=n.length,s=i.getJustification(),a=i.getLeading(),o=this.getView().getTextWidth(i.getFontStyle(),n),h=0;"left"!==s&&(h-=o/("center"===s?2:1));var u=new g(h,r?-.75*a:0,o,r*a);return t?t._transformBounds(u,u):u}}),F=r.extend(new function(){function t(t){var n,r=t.match(/^#(\w{1,2})(\w{1,2})(\w{1,2})$/);if(r){n=[0,0,0];for(s=0;s<3;s++){h=r[s+1];n[s]=parseInt(1==h.length?h+h:h,16)/255}}else if(r=t.match(/^rgba?\((.*)\)$/))for(var s=0,o=(n=r[1].split(",")).length;s<o;s++){var h=+n[s];n[s]=s<3?h/255:h}else if(i){var u=a[t];if(!u){e||((e=Q.getContext(1,1)).globalCompositeOperation="copy"),e.fillStyle="rgba(0,0,0,0)",e.fillStyle=t,e.fillRect(0,0,1,1);var l=e.getImageData(0,0,1,1).data;u=a[t]=[l[0]/255,l[1]/255,l[2]/255]}n=u.slice()}else n=[0,0,0];return n}var e,n={gray:["gray"],rgb:["red","green","blue"],hsb:["hue","saturation","brightness"],hsl:["hue","saturation","lightness"],gradient:["gradient","origin","destination","highlight"]},s={},a={},o=[[0,3,1],[2,0,1],[1,0,3],[1,2,0],[3,1,0],[0,1,2]],u={"rgb-hsb":function(t,e,i){var n=Math.max(t,e,i),r=n-Math.min(t,e,i);return[0===r?0:60*(n==t?(e-i)/r+(e<i?6:0):n==e?(i-t)/r+2:(t-e)/r+4),0===n?0:r/n,n]},"hsb-rgb":function(t,e,i){t=(t/60%6+6)%6;var n=Math.floor(t),r=t-n,s=[i,i*(1-e),i*(1-e*r),i*(1-e*(1-r))];return[s[(n=o[n])[0]],s[n[1]],s[n[2]]]},"rgb-hsl":function(t,e,i){var n=Math.max(t,e,i),r=Math.min(t,e,i),s=n-r,a=0===s,o=(n+r)/2;return[a?0:60*(n==t?(e-i)/s+(e<i?6:0):n==e?(i-t)/s+2:(t-e)/s+4),a?0:o<.5?s/(n+r):s/(2-n-r),o]},"hsl-rgb":function(t,e,i){if(t=(t/360%1+1)%1,0===e)return[i,i,i];for(var n=[t+1/3,t,t-1/3],r=i<.5?i*(1+e):i+e-i*e,s=2*i-r,a=[],o=0;o<3;o++){var h=n[o];h<0&&(h+=1),h>1&&(h-=1),a[o]=6*h<1?s+6*(r-s)*h:2*h<1?r:3*h<2?s+(r-s)*(2/3-h)*6:s}return a},"rgb-gray":function(t,e,i){return[.2989*t+.587*e+.114*i]},"gray-rgb":function(t){return[t,t,t]},"gray-hsb":function(t){return[0,0,t]},"gray-hsl":function(t){return[0,0,t]},"gradient-rgb":function(){return[]},"rgb-gradient":function(){return[]}};return r.each(n,function(t,e){s[e]=[],r.each(t,function(t,i){var a=r.capitalize(t),o=/^(hue|saturation)$/.test(t),h=s[e][i]="gradient"===t?function(t){var e=this._components[0];return t=R.read(Array.isArray(t)?t:arguments,0,{readNull:!0}),e!==t&&(e&&e._removeOwner(this),t&&t._addOwner(this)),t}:"gradient"===e?function(){return c.read(arguments,0,{readNull:"highlight"===t,clone:!0})}:function(t){return null==t||isNaN(t)?0:t};this["get"+a]=function(){return this._type===e||o&&/^hs[bl]$/.test(this._type)?this._components[i]:this._convert(e)[i]},this["set"+a]=function(t){this._type===e||o&&/^hs[bl]$/.test(this._type)||(this._components=this._convert(e),this._properties=n[e],this._type=e),this._components[i]=h.call(this,t),this._changed()}},this)},{_class:"Color",_readIndex:!0,initialize:function e(i){var a,o,h,u,l=arguments,c=this.__read,f=0;Array.isArray(i)&&(i=(l=i)[0]);var d=null!=i&&typeof i;if("string"===d&&i in n&&(a=i,i=l[1],Array.isArray(i)?(o=i,h=l[2]):(c&&(f=1),l=r.slice(l,1),d=typeof i)),!o){if(u="number"===d?l:"object"===d&&null!=i.length?i:null){a||(a=u.length>=3?"rgb":"gray");var _=n[a].length;h=u[_],c&&(f+=u===arguments?_+(null!=h?1:0):1),u.length>_&&(u=r.slice(u,0,_))}else if("string"===d)a="rgb",4===(o=t(i)).length&&(h=o[3],o.length--);else if("object"===d)if(i.constructor===e){if(a=i._type,o=i._components.slice(),h=i._alpha,"gradient"===a)for(var g=1,v=o.length;g<v;g++){var p=o[g];p&&(o[g]=p.clone())}}else if(i.constructor===R)a="gradient",u=l;else{var m=n[a="hue"in i?"lightness"in i?"hsl":"hsb":"gradient"in i||"stops"in i||"radial"in i?"gradient":"gray"in i?"gray":"rgb"],y=s[a];this._components=o=[];for(var g=0,v=m.length;g<v;g++)null==(w=i[m[g]])&&!g&&"gradient"===a&&"stops"in i&&(w={stops:i.stops,radial:i.radial}),null!=(w=y[g].call(this,w))&&(o[g]=w);h=i.alpha}c&&a&&(f=1)}if(this._type=a||"rgb",!o){this._components=o=[];for(var g=0,v=(y=s[this._type]).length;g<v;g++){var w=y[g].call(this,u&&u[g]);null!=w&&(o[g]=w)}}return this._components=o,this._properties=n[this._type],this._alpha=h,c&&(this.__read=f),this},set:"#initialize",_serialize:function(t,e){var i=this.getComponents();return r.serialize(/^(gray|rgb)$/.test(this._type)?i:[this._type].concat(i),t,!0,e)},_changed:function(){this._canvasStyle=null,this._owner&&this._owner._changed(65)},_convert:function(t){var e;return this._type===t?this._components.slice():(e=u[this._type+"-"+t])?e.apply(this,this._components):u["rgb-"+t].apply(this,u[this._type+"-rgb"].apply(this,this._components))},convert:function(t){return new F(t,this._convert(t),this._alpha)},getType:function(){return this._type},setType:function(t){this._components=this._convert(t),this._properties=n[t],this._type=t},getComponents:function(){var t=this._components.slice();return null!=this._alpha&&t.push(this._alpha),t},getAlpha:function(){return null!=this._alpha?this._alpha:1},setAlpha:function(t){this._alpha=null==t?null:Math.min(Math.max(t,0),1),this._changed()},hasAlpha:function(){return null!=this._alpha},equals:function(t){var e=r.isPlainValue(t,!0)?F.read(arguments):t;return e===this||e&&this._class===e._class&&this._type===e._type&&this.getAlpha()===e.getAlpha()&&r.equals(this._components,e._components)||!1},toString:function(){for(var t=this._properties,e=[],i="gradient"===this._type,n=h.instance,r=0,s=t.length;r<s;r++){var a=this._components[r];null!=a&&e.push(t[r]+": "+(i?a:n.number(a)))}return null!=this._alpha&&e.push("alpha: "+n.number(this._alpha)),"{ "+e.join(", ")+" }"},toCSS:function(t){function e(t){return Math.round(255*(t<0?0:t>1?1:t))}var i=this._convert("rgb"),n=t||null==this._alpha?1:this._alpha;return i=[e(i[0]),e(i[1]),e(i[2])],n<1&&i.push(n<0?0:n),t?"#"+((1<<24)+(i[0]<<16)+(i[1]<<8)+i[2]).toString(16).slice(1):(4==i.length?"rgba(":"rgb(")+i.join(",")+")"},toCanvasStyle:function(t,e){if(this._canvasStyle)return this._canvasStyle;if("gradient"!==this._type)return this._canvasStyle=this.toCSS();var i,n=this._components,r=n[0],s=r._stops,a=n[1],o=n[2],h=n[3],u=e&&e.inverted();if(u&&(a=u._transformPoint(a),o=u._transformPoint(o),h&&(h=u._transformPoint(h))),r._radial){var l=o.getDistance(a);if(h){var c=h.subtract(a);c.getLength()>l&&(h=a.add(c.normalize(l-.1)))}var f=h||a;i=t.createRadialGradient(f.x,f.y,0,a.x,a.y,l)}else i=t.createLinearGradient(a.x,a.y,o.x,o.y);for(var d=0,_=s.length;d<_;d++){var g=s[d],v=g._offset;i.addColorStop(null==v?d/(_-1):v,g._color.toCanvasStyle())}return this._canvasStyle=i},transform:function(t){if("gradient"===this._type){for(var e=this._components,i=1,n=e.length;i<n;i++){var r=e[i];t._transformPoint(r,r,!0)}this._changed()}},statics:{_types:n,random:function(){var t=Math.random;return new F(t(),t(),t())}}})},new function(){var t={add:function(t,e){return t+e},subtract:function(t,e){return t-e},multiply:function(t,e){return t*e},divide:function(t,e){return t/e}};return r.each(t,function(t,e){this[e]=function(e){e=F.read(arguments);for(var i=this._type,n=this._components,r=e._convert(i),s=0,a=n.length;s<a;s++)r[s]=t(n[s],r[s]);return new F(i,r,null!=this._alpha?t(this._alpha,e.getAlpha()):null)}},{})}),R=r.extend({_class:"Gradient",initialize:function(t,e){this._id=l.get(),t&&r.isPlainObject(t)&&(this.set(t),t=e=null),null==this._stops&&this.setStops(t||["white","black"]),null==this._radial&&this.setRadial("string"==typeof e&&"radial"===e||e||!1)},_serialize:function(t,e){return e.add(this,function(){return r.serialize([this._stops,this._radial],t,!0,e)})},_changed:function(){for(var t=0,e=this._owners&&this._owners.length;t<e;t++)this._owners[t]._changed()},_addOwner:function(t){this._owners||(this._owners=[]),this._owners.push(t)},_removeOwner:function(t){var i=this._owners?this._owners.indexOf(t):-1;-1!=i&&(this._owners.splice(i,1),this._owners.length||(this._owners=e))},clone:function(){for(var t=[],e=0,i=this._stops.length;e<i;e++)t[e]=this._stops[e].clone();return new R(t,this._radial)},getStops:function(){return this._stops},setStops:function(t){if(t.length<2)throw new Error("Gradient stop list needs to contain at least two stops.");var i=this._stops;if(i)for(var n=0,r=i.length;n<r;n++)i[n]._owner=e;for(var n=0,r=(i=this._stops=q.readList(t,0,{clone:!0})).length;n<r;n++)i[n]._owner=this;this._changed()},getRadial:function(){return this._radial},setRadial:function(t){this._radial=t,this._changed()},equals:function(t){if(t===this)return!0;if(t&&this._class===t._class){var e=this._stops,i=t._stops,n=e.length;if(n===i.length){for(var r=0;r<n;r++)if(!e[r].equals(i[r]))return!1;return!0}}return!1}}),q=r.extend({_class:"GradientStop",initialize:function(t,i){var n=t,r=i;"object"==typeof t&&i===e&&(Array.isArray(t)&&"number"!=typeof t[0]?(n=t[0],r=t[1]):("color"in t||"offset"in t||"rampPoint"in t)&&(n=t.color,r=t.offset||t.rampPoint||0)),this.setColor(n),this.setOffset(r)},clone:function(){return new q(this._color.clone(),this._offset)},_serialize:function(t,e){var i=this._color,n=this._offset;return r.serialize(null==n?[i]:[i,n],t,!0,e)},_changed:function(){this._owner&&this._owner._changed(65)},getOffset:function(){return this._offset},setOffset:function(t){this._offset=t,this._changed()},getRampPoint:"#getOffset",setRampPoint:"#setOffset",getColor:function(){return this._color},setColor:function(){var t=F.read(arguments,0,{clone:!0});t&&(t._owner=this),this._color=t,this._changed()},equals:function(t){return t===this||t&&this._class===t._class&&this._color.equals(t._color)&&this._offset==t._offset||!1}}),V=r.extend(new function(){var t={fillColor:null,fillRule:"nonzero",strokeColor:null,strokeWidth:1,strokeCap:"butt",strokeJoin:"miter",strokeScaling:!0,miterLimit:10,dashOffset:0,dashArray:[],shadowColor:null,shadowBlur:0,shadowOffset:new c,selectedColor:null},i=r.set({},t,{fontFamily:"sans-serif",fontWeight:"normal",fontSize:12,leading:null,justification:"left"}),n=r.set({},i,{fillColor:new F}),s={strokeWidth:97,strokeCap:97,strokeJoin:97,strokeScaling:105,miterLimit:97,fontFamily:9,fontWeight:9,fontSize:9,font:9,leading:9,justification:9},a={beans:!0},o={_class:"Style",beans:!0,initialize:function(e,r,s){this._values={},this._owner=r,this._project=r&&r._project||s||paper.project,this._defaults=!r||r instanceof x?i:r instanceof j?n:t,e&&this.set(e)}};return r.each(i,function(t,i){var n=/Color$/.test(i),h="shadowOffset"===i,u=r.capitalize(i),l=s[i],f="set"+u,d="get"+u;o[f]=function(t){var r=this._owner,s=r&&r._children;if(s&&s.length>0&&!(r instanceof N))for(var a=0,o=s.length;a<o;a++)s[a]._style[f](t);else if(i in this._defaults){var h=this._values[i];h!==t&&(n&&(h&&h._owner!==e&&(h._owner=e),t&&t.constructor===F&&(t._owner&&(t=t.clone()),t._owner=r)),this._values[i]=t,r&&r._changed(l||65))}},o[d]=function(t){var s,a=this._owner,o=a&&a._children;if(i in this._defaults&&(!o||!o.length||t||a instanceof N))if((s=this._values[i])===e)(s=this._defaults[i])&&s.clone&&(s=s.clone());else{var u=n?F:h?c:null;!u||s&&s.constructor===u||(this._values[i]=s=u.read([s],0,{readNull:!0,clone:!0}),s&&n&&(s._owner=a))}else if(o)for(var l=0,f=o.length;l<f;l++){var _=o[l]._style[d]();if(l){if(!r.equals(s,_))return e}else s=_}return s},a[d]=function(t){return this._style[d](t)},a[f]=function(t){this._style[f](t)}}),r.each({Font:"FontFamily",WindingRule:"FillRule"},function(t,e){var i="get"+e,n="set"+e;o[i]=a[i]="#get"+t,o[n]=a[n]="#set"+t}),w.inject(a),o},{set:function(t){var e=t instanceof V,i=e?t._values:t;if(i)for(var n in i)if(n in this._defaults){var r=i[n];this[n]=r&&e&&r.clone?r.clone():r}},equals:function(t){function i(t,i,n){var s=t._values,a=i._values,o=i._defaults;for(var h in s){var u=s[h],l=a[h];if(!(n&&h in a||r.equals(u,l===e?o[h]:l)))return!1}return!0}return t===this||t&&this._class===t._class&&i(this,t)&&i(t,this,!0)||!1},hasFill:function(){var t=this.getFillColor();return!!t&&t.alpha>0},hasStroke:function(){var t=this.getStrokeColor();return!!t&&t.alpha>0&&this.getStrokeWidth()>0},hasShadow:function(){var t=this.getShadowColor();return!!t&&t.alpha>0&&(this.getShadowBlur()>0||!this.getShadowOffset().isZero())},getView:function(){return this._project._view},getFontStyle:function(){var t=this.getFontSize();return this.getFontWeight()+" "+t+(/[a-z]/i.test(t+"")?" ":"px ")+this.getFontFamily()},getFont:"#getFontFamily",setFont:"#setFontFamily",getLeading:function t(){var e=t.base.call(this),i=this.getFontSize();return/pt|em|%|px/.test(i)&&(i=this.getView().getPixelSize(i)),null!=e?e:1.2*i}}),H=new function(){function t(t,e,i,n){for(var r=["","webkit","moz","Moz","ms","o"],s=e[0].toUpperCase()+e.substring(1),a=0;a<6;a++){var o=r[a],h=o?o+s:e;if(h in t){if(!i)return t[h];t[h]=n;break}}}return{getStyles:function(t){var e=t&&9!==t.nodeType?t.ownerDocument:t,i=e&&e.defaultView;return i&&i.getComputedStyle(t,"")},getBounds:function(t,e){var i,n=t.ownerDocument,r=n.body,s=n.documentElement;try{i=t.getBoundingClientRect()}catch(t){i={left:0,top:0,width:0,height:0}}var a=i.left-(s.clientLeft||r.clientLeft||0),o=i.top-(s.clientTop||r.clientTop||0);if(!e){var h=n.defaultView;a+=h.pageXOffset||s.scrollLeft||r.scrollLeft,o+=h.pageYOffset||s.scrollTop||r.scrollTop}return new g(a,o,i.width,i.height)},getViewportBounds:function(t){var e=t.ownerDocument,i=e.defaultView,n=e.documentElement;return new g(0,0,i.innerWidth||n.clientWidth,i.innerHeight||n.clientHeight)},getOffset:function(t,e){return H.getBounds(t,e).getPoint()},getSize:function(t){return H.getBounds(t,!0).getSize()},isInvisible:function(t){return H.getSize(t).equals(new d(0,0))},isInView:function(t){return!H.isInvisible(t)&&H.getViewportBounds(t).intersects(H.getBounds(t,!0))},isInserted:function(t){return n.body.contains(t)},getPrefixed:function(e,i){return e&&t(e,i)},setPrefixed:function(e,i,n){if("object"==typeof i)for(var r in i)t(e,r,!0,i[r]);else t(e,i,!0,n)}}},Z={add:function(t,e){if(t)for(var i in e)for(var n=e[i],r=i.split(/[\s,]+/g),s=0,a=r.length;s<a;s++)t.addEventListener(r[s],n,!1)},remove:function(t,e){if(t)for(var i in e)for(var n=e[i],r=i.split(/[\s,]+/g),s=0,a=r.length;s<a;s++)t.removeEventListener(r[s],n,!1)},getPoint:function(t){var e=t.targetTouches?t.targetTouches.length?t.targetTouches[0]:t.changedTouches[0]:t;return new c(e.pageX||e.clientX+n.documentElement.scrollLeft,e.pageY||e.clientY+n.documentElement.scrollTop)},getTarget:function(t){return t.target||t.srcElement},getRelatedTarget:function(t){return t.relatedTarget||t.toElement},getOffset:function(t,e){return Z.getPoint(t).subtract(H.getOffset(e||Z.getTarget(t)))}};Z.requestAnimationFrame=new function(){function t(){var e=s;s=[];for(var i=0,a=e.length;i<a;i++)e[i]();(r=n&&s.length)&&n(t)}var e,n=H.getPrefixed(i,"requestAnimationFrame"),r=!1,s=[];return function(i){s.push(i),n?r||(n(t),r=!0):e||(e=setInterval(t,1e3/60))}};var U=r.extend(s,{_class:"View",initialize:function t(e,r){function s(t){return r[t]||parseInt(r.getAttribute(t),10)}function o(){var t=H.getSize(r);return t.isNaN()||t.isZero()?new d(s("width"),s("height")):t}var h;if(i&&r){this._id=r.getAttribute("id"),null==this._id&&r.setAttribute("id",this._id="view-"+t._id++),Z.add(r,this._viewEvents);if(H.setPrefixed(r.style,{userDrag:"none",userSelect:"none",touchCallout:"none",contentZooming:"none",tapHighlightColor:"rgba(0,0,0,0)"}),a.hasAttribute(r,"resize")){var u=this;Z.add(i,this._windowEvents={resize:function(){u.setViewSize(o())}})}if(h=o(),a.hasAttribute(r,"stats")&&"undefined"!=typeof Stats){this._stats=new Stats;var l=this._stats.domElement,c=l.style,f=H.getOffset(r);c.position="absolute",c.left=f.x+"px",c.top=f.y+"px",n.body.appendChild(l)}}else h=new d(r),r=null;this._project=e,this._scope=e._scope,this._element=r,this._pixelRatio||(this._pixelRatio=i&&i.devicePixelRatio||1),this._setElementSize(h.width,h.height),this._viewSize=h,t._views.push(this),t._viewsById[this._id]=this,(this._matrix=new p)._owner=this,t._focused||(t._focused=this),this._frameItems={},this._frameItemCount=0,this._itemEvents={native:{},virtual:{}},this._autoUpdate=!paper.agent.node,this._needsUpdate=!1},remove:function(){if(!this._project)return!1;U._focused===this&&(U._focused=null),U._views.splice(U._views.indexOf(this),1),delete U._viewsById[this._id];var t=this._project;return t._view===this&&(t._view=null),Z.remove(this._element,this._viewEvents),Z.remove(i,this._windowEvents),this._element=this._project=null,this.off("frame"),this._animate=!1,this._frameItems={},!0},_events:r.each(w._itemHandlers.concat(["onResize","onKeyDown","onKeyUp"]),function(t){this[t]={}},{onFrame:{install:function(){this.play()},uninstall:function(){this.pause()}}}),_animate:!1,_time:0,_count:0,getAutoUpdate:function(){return this._autoUpdate},setAutoUpdate:function(t){this._autoUpdate=t,t&&this.requestUpdate()},update:function(){},draw:function(){this.update()},requestUpdate:function(){if(!this._requested){var t=this;Z.requestAnimationFrame(function(){if(t._requested=!1,t._animate){t.requestUpdate();var e=t._element;H.getPrefixed(n,"hidden")&&"true"!==a.getAttribute(e,"keepalive")||!H.isInView(e)||t._handleFrame()}t._autoUpdate&&t.update()}),this._requested=!0}},play:function(){this._animate=!0,this.requestUpdate()},pause:function(){this._animate=!1},_handleFrame:function(){paper=this._scope;var t=Date.now()/1e3,e=this._last?t-this._last:0;this._last=t,this.emit("frame",new r({delta:e,time:this._time+=e,count:this._count++})),this._stats&&this._stats.update()},_animateItem:function(t,e){var i=this._frameItems;e?(i[t._id]={item:t,time:0,count:0},1==++this._frameItemCount&&this.on("frame",this._handleFrameItems)):(delete i[t._id],0==--this._frameItemCount&&this.off("frame",this._handleFrameItems))},_handleFrameItems:function(t){for(var e in this._frameItems){var i=this._frameItems[e];i.item.emit("frame",new r(t,{time:i.time+=t.delta,count:i.count++}))}},_changed:function(){this._project._changed(2049),this._bounds=this._decomposed=e},getElement:function(){return this._element},getPixelRatio:function(){return this._pixelRatio},getResolution:function(){return 72*this._pixelRatio},getViewSize:function(){var t=this._viewSize;return new _(t.width,t.height,this,"setViewSize")},setViewSize:function(){var t=d.read(arguments),e=t.subtract(this._viewSize);e.isZero()||(this._setElementSize(t.width,t.height),this._viewSize.set(t),this._changed(),this.emit("resize",{size:t,delta:e}),this._autoUpdate&&this.update())},_setElementSize:function(t,e){var i=this._element;i&&(i.width!==t&&(i.width=t),i.height!==e&&(i.height=e))},getBounds:function(){return this._bounds||(this._bounds=this._matrix.inverted()._transformBounds(new g(new c,this._viewSize))),this._bounds},getSize:function(){return this.getBounds().getSize()},isVisible:function(){return H.isInView(this._element)},isInserted:function(){return H.isInserted(this._element)},getPixelSize:function(t){var e,i=this._element;if(i){var r=i.parentNode,s=n.createElement("div");s.style.fontSize=t,r.appendChild(s),e=parseFloat(H.getStyles(s).fontSize),r.removeChild(s)}else e=parseFloat(e);return e},getTextWidth:function(t,e){return 0}},r.each(["rotate","scale","shear","skew"],function(t){var e="rotate"===t;this[t]=function(){var i=(e?r:c).read(arguments),n=c.read(arguments,0,{readNull:!0});return this.transform((new p)[t](i,n||this.getCenter(!0)))}},{_decompose:function(){return this._decomposed||(this._decomposed=this._matrix.decompose())},translate:function(){var t=new p;return this.transform(t.translate.apply(t,arguments))},getCenter:function(){return this.getBounds().getCenter()},setCenter:function(){var t=c.read(arguments);this.translate(this.getCenter().subtract(t))},getZoom:function(){var t=this._decompose(),e=t&&t.scaling;return e?(e.x+e.y)/2:0},setZoom:function(t){this.transform((new p).scale(t/this.getZoom(),this.getCenter()))},getRotation:function(){var t=this._decompose();return t&&t.rotation},setRotation:function(t){var e=this.getRotation();null!=e&&null!=t&&this.rotate(t-e)},getScaling:function(){var t=this._decompose(),i=t&&t.scaling;return i?new f(i.x,i.y,this,"setScaling"):e},setScaling:function(){var t=this.getScaling(),e=c.read(arguments,0,{clone:!0,readNull:!0});t&&e&&this.scale(e.x/t.x,e.y/t.y)},getMatrix:function(){return this._matrix},setMatrix:function(){var t=this._matrix;t.initialize.apply(t,arguments)},transform:function(t){this._matrix.append(t)},scrollBy:function(){this.translate(c.read(arguments).negate())}}),{projectToView:function(){return this._matrix._transformPoint(c.read(arguments))},viewToProject:function(){return this._matrix._inverseTransform(c.read(arguments))},getEventPoint:function(t){return this.viewToProject(Z.getOffset(t,this._element))}},{statics:{_views:[],_viewsById:{},_id:0,create:function(t,e){return n&&"string"==typeof e&&(e=n.getElementById(e)),new(i?W:U)(t,e)}}},new function(){function t(t){var e=Z.getTarget(t);return e.getAttribute&&U._viewsById[e.getAttribute("id")]}function e(){var t=U._focused;if(!t||!t.isVisible())for(var e=0,i=U._views.length;e<i;e++)if((t=U._views[e]).isVisible()){U._focused=h=t;break}}function r(t,e,i){t._handleMouseEvent("mousemove",e,i)}function s(t,e,i,n,r,s,a){function o(t,i){if(t.responds(i)){if(h||(h=new X(i,n,r,e||t,s?r.subtract(s):null)),t.emit(i,h)&&(I=!0,h.prevented&&(M=!0),h.stopped))return u=!0}else{var a=T[i];if(a)return o(t,a)}}for(var h,u=!1;t&&t!==a&&!o(t,i);)t=t._parent;return u}function a(t,e,i,n,r,a){return t._project.removeOn(i),M=I=!1,b&&s(b,null,i,n,r,a)||e&&e!==b&&!e.isDescendant(b)&&s(e,null,i,n,r,a,b)||s(t,b||e||t,i,n,r,a)}if(i){var o,h,u,l,c,f=!1,d=!1,_=i.navigator;_.pointerEnabled||_.msPointerEnabled?(u="pointerdown MSPointerDown",l="pointermove MSPointerMove",c="pointerup pointercancel MSPointerUp MSPointerCancel"):(u="touchstart",l="touchmove",c="touchend touchcancel","ontouchstart"in i&&_.userAgent.match(/mobile|tablet|ip(ad|hone|od)|android|silk/i)||(u+=" mousedown",l+=" mousemove",c+=" mouseup"));var g={},v={mouseout:function(t){var e=U._focused,i=Z.getRelatedTarget(t);if(e&&(!i||"HTML"===i.nodeName)){var n=Z.getOffset(t,e._element),s=n.x,a=Math.abs,o=a(s),h=o-(1<<25);n.x=a(h)<o?h*(s<0?-1:1):s,r(e,t,e.viewToProject(n))}},scroll:e};g[u]=function(e){var i=U._focused=t(e);f||(f=!0,i._handleMouseEvent("mousedown",e))},v[l]=function(i){var n=U._focused;if(!d){var s=t(i);s?n!==s&&(n&&r(n,i),o||(o=n),n=U._focused=h=s):h&&h===n&&(o&&!o.isInserted()&&(o=null),n=U._focused=o,o=null,e())}n&&r(n,i)},v[u]=function(){d=!0},v[c]=function(t){var e=U._focused;e&&f&&e._handleMouseEvent("mouseup",t),d=f=!1},Z.add(n,v),Z.add(i,{load:e});var p,m,y,w,x,b,C,S,P,I=!1,M=!1,T={doubleclick:"click",mousedrag:"mousemove"},z=!1,k={mousedown:{mousedown:1,mousedrag:1,click:1,doubleclick:1},mouseup:{mouseup:1,mousedrag:1,click:1,doubleclick:1},mousemove:{mousedrag:1,mousemove:1,mouseenter:1,mouseleave:1}};return{_viewEvents:g,_handleMouseEvent:function(t,e,i){function n(t){return r.virtual[t]||l.responds(t)||u&&u.responds(t)}var r=this._itemEvents,o=r.native[t],h="mousemove"===t,u=this._scope.tool,l=this;h&&f&&n("mousedrag")&&(t="mousedrag"),i||(i=this.getEventPoint(e));var c=this.getBounds().contains(i),d=o&&c&&l._project.hitTest(i,{tolerance:0,fill:!0,stroke:!0}),_=d&&d.item||null,g=!1,v={};if(v[t.substr(5)]=!0,o&&_!==x&&(x&&s(x,null,"mouseleave",e,i),_&&s(_,null,"mouseenter",e,i),x=_),z^c&&(s(this,null,c?"mouseenter":"mouseleave",e,i),p=c?this:null,g=!0),!c&&!v.drag||i.equals(y)||(a(this,_,h?t:"mousemove",e,i,y),g=!0),z=c,v.down&&c||v.up&&m){if(a(this,_,t,e,i,m),v.down){if(P=_===C&&Date.now()-S<300,w=C=_,!M&&_){for(var T=_;T&&!T.responds("mousedrag");)T=T._parent;T&&(b=_)}m=i}else v.up&&(M||_!==w||(S=Date.now(),a(this,_,P?"doubleclick":"click",e,i,m),P=!1),w=b=null);z=!1,g=!0}y=i,g&&u&&(I=u._handleMouseEvent(t,e,i,v)||I),(I&&!v.move||v.down&&n("mouseup"))&&e.preventDefault()},_handleKeyEvent:function(t,e,i,n){function r(r){r.responds(t)&&(paper=a,r.emit(t,s=s||new J(t,e,i,n)))}var s,a=this._scope,o=a.tool;this.isVisible()&&(r(this),o&&o.responds(t)&&r(o))},_countItemEvent:function(t,e){var i=this._itemEvents,n=i.native,r=i.virtual;for(var s in k)n[s]=(n[s]||0)+(k[s][t]||0)*e;r[t]=(r[t]||0)+e},statics:{updateFocus:e}}}}),W=U.extend({_class:"CanvasView",initialize:function(t,e){if(!(e instanceof i.HTMLCanvasElement)){var n=d.read(arguments,1);if(n.isZero())throw new Error("Cannot create CanvasView with the provided argument: "+r.slice(arguments,1));e=Q.getCanvas(n)}var s=this._context=e.getContext("2d");if(s.save(),this._pixelRatio=1,!/^off|false$/.test(a.getAttribute(e,"hidpi"))){var o=i.devicePixelRatio||1,h=H.getPrefixed(s,"backingStorePixelRatio")||1;this._pixelRatio=o/h}U.call(this,t,e),this._needsUpdate=!0},remove:function t(){return this._context.restore(),t.base.call(this)},_setElementSize:function t(e,i){var n=this._pixelRatio;if(t.base.call(this,e*n,i*n),1!==n){var r=this._element,s=this._context;if(!a.hasAttribute(r,"resize")){var o=r.style;o.width=e+"px",o.height=i+"px"}s.restore(),s.save(),s.scale(n,n)}},getPixelSize:function t(e){var i,n=paper.agent;if(n&&n.firefox)i=t.base.call(this,e);else{var r=this._context,s=r.font;r.font=e+" serif",i=parseFloat(r.font),r.font=s}return i},getTextWidth:function(t,e){var i=this._context,n=i.font,r=0;i.font=t;for(var s=0,a=e.length;s<a;s++)r=Math.max(r,i.measureText(e[s]).width);return i.font=n,r},update:function(){if(!this._needsUpdate)return!1;var t=this._project,e=this._context,i=this._viewSize;return e.clearRect(0,0,i.width+1,i.height+1),t&&t.draw(e,this._matrix,this._pixelRatio),this._needsUpdate=!1,!0}}),G=r.extend({_class:"Event",initialize:function(t){this.event=t,this.type=t&&t.type},prevented:!1,stopped:!1,preventDefault:function(){this.prevented=!0,this.event.preventDefault()},stopPropagation:function(){this.stopped=!0,this.event.stopPropagation()},stop:function(){this.stopPropagation(),this.preventDefault()},getTimeStamp:function(){return this.event.timeStamp},getModifiers:function(){return $.modifiers}}),J=G.extend({_class:"KeyEvent",initialize:function(t,e,i,n){this.type=t,this.event=e,this.key=i,this.character=n},toString:function(){return"{ type: '"+this.type+"', key: '"+this.key+"', character: '"+this.character+"', modifiers: "+this.getModifiers()+" }"}}),$=new function(){function t(t){var i=t.key||t.keyIdentifier;return i=/^U\+/.test(i)?String.fromCharCode(parseInt(i.substr(2),16)):/^Arrow[A-Z]/.test(i)?i.substr(5):"Unidentified"===i||i===e?String.fromCharCode(t.keyCode):i,h[i]||(i.length>1?r.hyphenate(i):i.toLowerCase())}function s(t,e,i,n){var o,h=U._focused;if(l[e]=t,t?c[e]=i:delete c[e],e.length>1&&(o=r.camelize(e))in f){f[o]=t;var u=paper&&paper.agent;if("meta"===o&&u&&u.mac)if(t)a={};else{for(var d in a)d in c&&s(!1,d,a[d],n);a=null}}else t&&a&&(a[e]=i);h&&h._handleKeyEvent(t?"keydown":"keyup",n,e,i)}var a,o,h={"\t":"tab"," ":"space","\b":"backspace","":"delete",Spacebar:"space",Del:"delete",Win:"meta",Esc:"escape"},u={tab:"\t",space:" ",enter:"\r"},l={},c={},f=new r({shift:!1,control:!1,alt:!1,meta:!1,capsLock:!1,space:!1}).inject({option:{get:function(){return this.alt}},command:{get:function(){var t=paper&&paper.agent;return t&&t.mac?this.meta:this.control}}});return Z.add(n,{keydown:function(e){var i=t(e),n=paper&&paper.agent;i.length>1||n&&n.chrome&&(e.altKey||n.mac&&e.metaKey||!n.mac&&e.ctrlKey)?s(!0,i,u[i]||(i.length>1?"":i),e):o=i},keypress:function(e){if(o){var i=t(e),n=e.charCode,r=n>=32?String.fromCharCode(n):i.length>1?"":i;i!==o&&(i=r.toLowerCase()),s(!0,i,r,e),o=null}},keyup:function(e){var i=t(e);i in c&&s(!1,i,c[i],e)}}),Z.add(i,{blur:function(t){for(var e in c)s(!1,e,c[e],t)}}),{modifiers:f,isDown:function(t){return!!l[t]}}},X=G.extend({_class:"MouseEvent",initialize:function(t,e,i,n,r){this.type=t,this.event=e,this.point=i,this.target=n,this.delta=r},toString:function(){return"{ type: '"+this.type+"', point: "+this.point+", target: "+this.target+(this.delta?", delta: "+this.delta:"")+", modifiers: "+this.getModifiers()+" }"}}),Y=G.extend({_class:"ToolEvent",_item:null,initialize:function(t,e,i){this.tool=t,this.type=e,this.event=i},_choosePoint:function(t,e){return t||(e?e.clone():null)},getPoint:function(){return this._choosePoint(this._point,this.tool._point)},setPoint:function(t){this._point=t},getLastPoint:function(){return this._choosePoint(this._lastPoint,this.tool._lastPoint)},setLastPoint:function(t){this._lastPoint=t},getDownPoint:function(){return this._choosePoint(this._downPoint,this.tool._downPoint)},setDownPoint:function(t){this._downPoint=t},getMiddlePoint:function(){return!this._middlePoint&&this.tool._lastPoint?this.tool._point.add(this.tool._lastPoint).divide(2):this._middlePoint},setMiddlePoint:function(t){this._middlePoint=t},getDelta:function(){return!this._delta&&this.tool._lastPoint?this.tool._point.subtract(this.tool._lastPoint):this._delta},setDelta:function(t){this._delta=t},getCount:function(){return this.tool[/^mouse(down|up)$/.test(this.type)?"_downCount":"_moveCount"]},setCount:function(t){this.tool[/^mouse(down|up)$/.test(this.type)?"downCount":"count"]=t},getItem:function(){if(!this._item){var t=this.tool._scope.project.hitTest(this.getPoint());if(t){for(var e=t.item,i=e._parent;/^(Group|CompoundPath)$/.test(i._class);)e=i,i=i._parent;this._item=e}}return this._item},setItem:function(t){this._item=t},toString:function(){return"{ type: "+this.type+", point: "+this.getPoint()+", count: "+this.getCount()+", modifiers: "+this.getModifiers()+" }"}}),K=(o.extend({_class:"Tool",_list:"tools",_reference:"tool",_events:["onMouseDown","onMouseUp","onMouseDrag","onMouseMove","onActivate","onDeactivate","onEditOptions","onKeyDown","onKeyUp"],initialize:function(t){o.call(this),this._moveCount=-1,this._downCount=-1,this.set(t)},getMinDistance:function(){return this._minDistance},setMinDistance:function(t){this._minDistance=t,null!=t&&null!=this._maxDistance&&t>this._maxDistance&&(this._maxDistance=t)},getMaxDistance:function(){return this._maxDistance},setMaxDistance:function(t){this._maxDistance=t,null!=this._minDistance&&null!=t&&t<this._minDistance&&(this._minDistance=t)},getFixedDistance:function(){return this._minDistance==this._maxDistance?this._minDistance:null},setFixedDistance:function(t){this._minDistance=this._maxDistance=t},_handleMouseEvent:function(t,e,i,n){function r(t,e){var r=i,s=a?c._point:c._downPoint||r;if(a){if(c._moveCount&&r.equals(s))return!1;if(s&&(null!=t||null!=e)){var o=r.subtract(s),h=o.getLength();if(h<(t||0))return!1;e&&(r=s.add(o.normalize(Math.min(h,e))))}c._moveCount++}return c._point=r,c._lastPoint=s||r,n.down&&(c._moveCount=-1,c._downPoint=r,c._downCount++),!0}function s(){o&&(l=c.emit(t,new Y(c,t,e))||l)}paper=this._scope,n.drag&&!this.responds(t)&&(t="mousemove");var a=n.move||n.drag,o=this.responds(t),h=this.minDistance,u=this.maxDistance,l=!1,c=this;if(n.down)r(),s();else if(n.up)r(null,u),s();else if(o)for(;r(h,u);)s();return l}}),{request:function(e){var i=new t.XMLHttpRequest;return i.open((e.method||"get").toUpperCase(),e.url,r.pick(e.async,!0)),e.mimeType&&i.overrideMimeType(e.mimeType),i.onload=function(){var t=i.status;0===t||200===t?e.onLoad&&e.onLoad.call(i,i.responseText):i.onerror()},i.onerror=function(){var t=i.status,n='Could not load "'+e.url+'" (Status: '+t+")";if(!e.onError)throw new Error(n);e.onError(n,t)},i.send(null)}}),Q={canvases:[],getCanvas:function(t,e){if(!i)return null;var r,s=!0;"object"==typeof t&&(e=t.height,t=t.width),this.canvases.length?r=this.canvases.pop():(r=n.createElement("canvas"),s=!1);var a=r.getContext("2d");if(!a)throw new Error("Canvas "+r+" is unable to provide a 2D context.");return r.width===t&&r.height===e?s&&a.clearRect(0,0,t+1,e+1):(r.width=t,r.height=e),a.save(),r},getContext:function(t,e){var i=this.getCanvas(t,e);return i?i.getContext("2d"):null},release:function(t){var e=t&&t.canvas?t.canvas:t;e&&e.getContext&&(e.getContext("2d").restore(),this.canvases.push(e))}},tt=new function(){function t(t,e,i){return.2989*t+.587*e+.114*i}function e(e,i,n,r){var s=r-t(e,i,n),r=t(d=e+s,_=i+s,g=n+s),a=v(d,_,g),o=p(d,_,g);if(a<0){var h=r-a;d=r+(d-r)*r/h,_=r+(_-r)*r/h,g=r+(g-r)*r/h}if(o>255){var u=255-r,l=o-r;d=r+(d-r)*u/l,_=r+(_-r)*u/l,g=r+(g-r)*u/l}}function i(t,e,i){return p(t,e,i)-v(t,e,i)}function n(t,e,i,n){var r,s=[t,e,i],a=p(t,e,i),o=v(t,e,i);r=0===v(o=o===t?0:o===e?1:2,a=a===t?0:a===e?1:2)?1===p(o,a)?2:1:0,s[a]>s[o]?(s[r]=(s[r]-s[o])*n/(s[a]-s[o]),s[a]=n):s[r]=s[a]=0,s[o]=0,d=s[0],_=s[1],g=s[2]}var s,a,o,h,u,l,c,f,d,_,g,v=Math.min,p=Math.max,m=Math.abs,y={multiply:function(){d=u*s/255,_=l*a/255,g=c*o/255},screen:function(){d=u+s-u*s/255,_=l+a-l*a/255,g=c+o-c*o/255},overlay:function(){d=u<128?2*u*s/255:255-2*(255-u)*(255-s)/255,_=l<128?2*l*a/255:255-2*(255-l)*(255-a)/255,g=c<128?2*c*o/255:255-2*(255-c)*(255-o)/255},"soft-light":function(){var t=s*u/255;d=t+u*(255-(255-u)*(255-s)/255-t)/255,_=(t=a*l/255)+l*(255-(255-l)*(255-a)/255-t)/255,g=(t=o*c/255)+c*(255-(255-c)*(255-o)/255-t)/255},"hard-light":function(){d=s<128?2*s*u/255:255-2*(255-s)*(255-u)/255,_=a<128?2*a*l/255:255-2*(255-a)*(255-l)/255,g=o<128?2*o*c/255:255-2*(255-o)*(255-c)/255},"color-dodge":function(){d=0===u?0:255===s?255:v(255,255*u/(255-s)),_=0===l?0:255===a?255:v(255,255*l/(255-a)),g=0===c?0:255===o?255:v(255,255*c/(255-o))},"color-burn":function(){d=255===u?255:0===s?0:p(0,255-255*(255-u)/s),_=255===l?255:0===a?0:p(0,255-255*(255-l)/a),g=255===c?255:0===o?0:p(0,255-255*(255-c)/o)},darken:function(){d=u<s?u:s,_=l<a?l:a,g=c<o?c:o},lighten:function(){d=u>s?u:s,_=l>a?l:a,g=c>o?c:o},difference:function(){(d=u-s)<0&&(d=-d),(_=l-a)<0&&(_=-_),(g=c-o)<0&&(g=-g)},exclusion:function(){d=u+s*(255-u-u)/255,_=l+a*(255-l-l)/255,g=c+o*(255-c-c)/255},hue:function(){n(s,a,o,i(u,l,c)),e(d,_,g,t(u,l,c))},saturation:function(){n(u,l,c,i(s,a,o)),e(d,_,g,t(u,l,c))},luminosity:function(){e(u,l,c,t(s,a,o))},color:function(){e(s,a,o,t(u,l,c))},add:function(){d=v(u+s,255),_=v(l+a,255),g=v(c+o,255)},subtract:function(){d=p(u-s,0),_=p(l-a,0),g=p(c-o,0)},average:function(){d=(u+s)/2,_=(l+a)/2,g=(c+o)/2},negation:function(){d=255-m(255-s-u),_=255-m(255-a-l),g=255-m(255-o-c)}},w=this.nativeModes=r.each(["source-over","source-in","source-out","source-atop","destination-over","destination-in","destination-out","destination-atop","lighter","darker","copy","xor"],function(t){this[t]=!0},{}),x=Q.getContext(1,1);x&&(r.each(y,function(t,e){var i="darken"===e,n=!1;x.save();try{x.fillStyle=i?"#300":"#a00",x.fillRect(0,0,1,1),x.globalCompositeOperation=e,x.globalCompositeOperation===e&&(x.fillStyle=i?"#a00":"#300",x.fillRect(0,0,1,1),n=x.getImageData(0,0,1,1).data[0]!==i?170:51)}catch(t){}x.restore(),w[e]=n}),Q.release(x)),this.process=function(t,e,i,n,r){var v=e.canvas,p="normal"===t;if(p||w[t])i.save(),i.setTransform(1,0,0,1,0,0),i.globalAlpha=n,p||(i.globalCompositeOperation=t),i.drawImage(v,r.x,r.y),i.restore();else{var m=y[t];if(!m)return;for(var x=i.getImageData(r.x,r.y,v.width,v.height),b=x.data,C=e.getImageData(0,0,v.width,v.height).data,S=0,P=b.length;S<P;S+=4){s=C[S],u=b[S],a=C[S+1],l=b[S+1],o=C[S+2],c=b[S+2],h=C[S+3],f=b[S+3],m();var I=h*n/255,M=1-I;b[S]=I*d+M*u,b[S+1]=I*_+M*l,b[S+2]=I*g+M*c,b[S+3]=h*n+M*f}i.putImageData(x,r.x,r.y)}}},et=new function(){function t(t,e,i){for(var n in e){var r=e[n],a=s[n];"number"==typeof r&&i&&(r=i.number(r)),a?t.setAttributeNS(a,n,r):t.setAttribute(n,r)}return t}var e="http://www.w3.org/2000/svg",i="http://www.w3.org/2000/xmlns",r="http://www.w3.org/1999/xlink",s={href:r,xlink:i,xmlns:i+"/","xmlns:xlink":i+"/"};return{svg:e,xmlns:i,xlink:r,create:function(i,r,s){return t(n.createElementNS(e,i),r,s)},get:function(t,e){var i=s[e],n=i?t.getAttributeNS(i,e):t.getAttribute(e);return"null"===n?null:n},set:t}},it=r.each({fillColor:["fill","color"],fillRule:["fill-rule","string"],strokeColor:["stroke","color"],strokeWidth:["stroke-width","number"],strokeCap:["stroke-linecap","string"],strokeJoin:["stroke-linejoin","string"],strokeScaling:["vector-effect","lookup",{true:"none",false:"non-scaling-stroke"},function(t,e){return!e&&(t instanceof A||t instanceof C||t instanceof j)}],miterLimit:["stroke-miterlimit","number"],dashArray:["stroke-dasharray","array"],dashOffset:["stroke-dashoffset","number"],fontFamily:["font-family","string"],fontWeight:["font-weight","string"],fontSize:["font-size","number"],justification:["text-anchor","lookup",{left:"start",center:"middle",right:"end"}],opacity:["opacity","number"],blendMode:["mix-blend-mode","style"]},function(t,e){var i=r.capitalize(e),n=t[2];this[e]={type:t[1],property:e,attribute:t[0],toSVG:n,fromSVG:n&&r.each(n,function(t,e){this[t]=e},{}),exportFilter:t[3],get:"get"+i,set:"set"+i}},{});return new function(){function e(t,e,i){var n=new r,s=t.getTranslation();if(e){var a=(t=t._shiftless())._inverseTransform(s);n[i?"cx":"x"]=a.x,n[i?"cy":"y"]=a.y,s=null}if(!t.isIdentity()){var o=t.decompose();if(o){var h=[],l=o.rotation,c=o.scaling,f=o.skewing;s&&!s.isZero()&&h.push("translate("+v.point(s)+")"),l&&h.push("rotate("+v.number(l)+")"),u.isZero(c.x-1)&&u.isZero(c.y-1)||h.push("scale("+v.point(c)+")"),f.x&&h.push("skewX("+v.number(f.x)+")"),f.y&&h.push("skewY("+v.number(f.y)+")"),n.transform=h.join(" ")}else n.transform="matrix("+t.getValues().join(",")+")"}return n}function i(t,i){for(var n=e(t._matrix),r=t._children,s=et.create("g",n,v),a=0,o=r.length;a<o;a++){var h=r[a],u=d(h,i);if(u)if(h.isClipMask()){var l=et.create("clipPath");l.appendChild(u),c(h,l,"clip"),et.set(s,{"clip-path":"url(#"+l.id+")"})}else s.appendChild(u)}return s}function n(t){var i=t._type,n=t._radius,r=e(t._matrix,!0,"rectangle"!==i);if("rectangle"===i){i="rect";var s=t._size,a=s.width,o=s.height;r.x-=a/2,r.y-=o/2,r.width=a,r.height=o,n.isZero()&&(n=null)}return n&&("circle"===i?r.r=n:(r.rx=n.width,r.ry=n.height)),et.create(i,r,v)}function s(t){var e=o(t,"color");if(!e){var i,n=t.getGradient(),r=n._radial,s=t.getOrigin(),a=t.getDestination();if(r){i={cx:s.x,cy:s.y,r:s.getDistance(a)};var h=t.getHighlight();h&&(i.fx=h.x,i.fy=h.y)}else i={x1:s.x,y1:s.y,x2:a.x,y2:a.y};i.gradientUnits="userSpaceOnUse",e=et.create((r?"radial":"linear")+"Gradient",i,v);for(var u=n._stops,l=0,f=u.length;l<f;l++){var d=u[l],_=d._color,g=_.getAlpha(),p=d._offset;i={offset:null==p?l/(f-1):p},_&&(i["stop-color"]=_.toCSS(!0)),g<1&&(i["stop-opacity"]=g),e.appendChild(et.create("stop",i,v))}c(t,e,"color")}return"url(#"+e.id+")"}function a(t,e,i){var n={},a=!i&&t.getParent(),o=[];return null!=t._name&&(n.id=t._name),r.each(it,function(e){var i=e.get,h=e.type,u=t[i]();if(e.exportFilter?e.exportFilter(t,u):!a||!r.equals(a[i](),u)){if("color"===h&&null!=u){var l=u.getAlpha();l<1&&(n[e.attribute+"-opacity"]=l)}"style"===h?o.push(e.attribute+": "+u):n[e.attribute]=null==u?"none":"color"===h?u.gradient?s(u,t):u.toCSS(!0):"array"===h?u.join(","):"lookup"===h?e.toSVG[u]:u}}),o.length&&(n.style=o.join(";")),1===n.opacity&&delete n.opacity,t._visible||(n.visibility="hidden"),et.set(e,n,v)}function o(t,e){return m||(m={ids:{},svgs:{}}),t&&m.svgs[e+"-"+(t._id||t.__id||(t.__id=l.get("svg")))]}function c(t,e,i){m||o();var n=m.ids[i]=(m.ids[i]||0)+1;e.id=i+"-"+n,m.svgs[i+"-"+(t._id||t.__id)]=e}function f(e,i){var n=e,r=null;if(m){n="svg"===e.nodeName.toLowerCase()&&e;for(var s in m.svgs)r||(n||(n=et.create("svg")).appendChild(e),r=n.insertBefore(et.create("defs"),n.firstChild)),r.appendChild(m.svgs[s]);m=null}return i.asString?(new t.XMLSerializer).serializeToString(n):n}function d(t,e,i){var n=x[t._class],r=n&&n(t,e);if(r){var s=e.onExport;s&&(r=s(t,r,e)||r);var o=JSON.stringify(t._data);o&&"{}"!==o&&"null"!==o&&r.setAttribute("data-paper-data",o)}return r&&a(t,r,i)}function _(t){return t||(t={}),v=new h(t.precision),t}var v,m,x={Group:i,Layer:i,Raster:function(t,i){var n=e(t._matrix,!0),r=t.getSize(),s=t.getImage();return n.x-=r.width/2,n.y-=r.height/2,n.width=r.width,n.height=r.height,n.href=0==i.embedImages&&s&&s.src||t.toDataURL(),et.create("image",n,v)},Path:function(t,i){var r=i.matchShapes;if(r){var s=t.toShape(!1);if(s)return n(s)}var a,o=t._segments,h=o.length,u=e(t._matrix);if(r&&h>=2&&!t.hasHandles())if(h>2){a=t._closed?"polygon":"polyline";for(var l=[],c=0;c<h;c++)l.push(v.point(o[c]._point));u.points=l.join(" ")}else{a="line";var f=o[0]._point,d=o[1]._point;u.set({x1:f.x,y1:f.y,x2:d.x,y2:d.y})}else a="path",u.d=t.getPathData(null,i.precision);return et.create(a,u,v)},Shape:n,CompoundPath:function(t,i){var n=e(t._matrix),r=t.getPathData(null,i.precision);return r&&(n.d=r),et.create("path",n,v)},SymbolItem:function(t,i){var n=e(t._matrix,!0),r=t._definition,s=o(r,"symbol"),a=r._item,h=a.getBounds();return s||((s=et.create("symbol",{viewBox:v.rectangle(h)})).appendChild(d(a,i)),c(r,s,"symbol")),n.href="#"+s.id,n.x+=h.x,n.y+=h.y,n.width=h.width,n.height=h.height,n.overflow="visible",et.create("use",n,v)},PointText:function(t){var i=et.create("text",e(t._matrix,!0),v);return i.textContent=t._content,i}};w.inject({exportSVG:function(t){return t=_(t),f(d(this,t,!0),t)}}),y.inject({exportSVG:function(t){t=_(t);var i=this._children,n=this.getView(),s=r.pick(t.bounds,"view"),a=t.matrix||"view"===s&&n._matrix,o=a&&p.read([a]),h="view"===s?new g([0,0],n.getViewSize()):"content"===s?w._getBounds(i,o,{stroke:!0}).rect:g.read([s],0,{readNull:!0}),u={version:"1.1",xmlns:et.svg,"xmlns:xlink":et.xlink};h&&(u.width=h.width,u.height=h.height,(h.x||h.y)&&(u.viewBox=v.rectangle(h)));var l=et.create("svg",u,v),c=l;o&&!o.isIdentity()&&(c=l.appendChild(et.create("g",e(o),v)));for(var m=0,y=i.length;m<y;m++)c.appendChild(d(i[m],t,!0));return f(l,t)}})},new function(){function s(t,e,i,n,r){var s=et.get(t,e),a=null==s?n?null:i?"":0:i?s:parseFloat(s);return/%\s*$/.test(s)?a/100*(r?1:z[/x|^width/.test(e)?"width":"height"]):a}function a(t,e,i,n,r){return e=s(t,e||"x",!1,n,r),i=s(t,i||"y",!1,n,r),!n||null!=e&&null!=i?new c(e,i):null}function o(t,e,i,n,r){return e=s(t,e||"width",!1,n,r),i=s(t,i||"height",!1,n,r),!n||null!=e&&null!=i?new d(e,i):null}function h(t,e,i){return"none"===t?null:"number"===e?parseFloat(t):"array"===e?t?t.split(/[\s,]+/g).map(parseFloat):[]:"color"===e?P(t)||t:"lookup"===e?i[t]:t}function u(t,e,i,n){var r=t.childNodes,s="clippath"===e,a="defs"===e,o=new x,h=o._project,u=h._currentStyle,l=[];if(s||a||(o=b(o,t,n),h._currentStyle=o._style.clone()),n)for(var c=t.querySelectorAll("defs"),f=0,d=c.length;f<d;f++)M(c[f],i,!1);for(var f=0,d=r.length;f<d;f++){var _,g=r[f];1!==g.nodeType||/^defs$/i.test(g.nodeName)||!(_=M(g,i,!1))||_ instanceof I||l.push(_)}return o.addChildren(l),s&&(o=b(o.reduce(),t,n)),h._currentStyle=u,(s||a)&&(o.remove(),o=null),o}function l(t,e){for(var i=t.getAttribute("points").match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),n=[],r=0,s=i.length;r<s;r+=2)n.push(new c(parseFloat(i[r]),parseFloat(i[r+1])));var a=new L(n);return"polygon"===e&&a.closePath(),a}function f(t,e){var i,n=(s(t,"href",!0)||"").substring(1),r="radialgradient"===e;if(n)(i=k[n].getGradient())._radial^r&&((i=i.clone())._radial=r);else{for(var o=t.childNodes,h=[],u=0,l=o.length;u<l;u++){var c=o[u];1===c.nodeType&&h.push(b(new q,c))}i=new R(h,r)}var f,d,_,g="userSpaceOnUse"!==s(t,"gradientUnits",!0);return r?(d=(f=a(t,"cx","cy",!1,g)).add(s(t,"r",!1,!1,g),0),_=a(t,"fx","fy",!0,g)):(f=a(t,"x1","y1",!1,g),d=a(t,"x2","y2",!1,g)),b(new F(i,f,d,_),t)._scaleToBounds=g,null}function _(t,e,i,n){if(t.transform){for(var r=(n.getAttribute(i)||"").split(/\)\s*/g),s=new p,a=0,o=r.length;a<o;a++){var h=r[a];if(!h)break;for(var u=h.split(/\(\s*/),l=u[0],c=u[1].split(/[\s,]+/g),f=0,d=c.length;f<d;f++)c[f]=parseFloat(c[f]);switch(l){case"matrix":s.append(new p(c[0],c[1],c[2],c[3],c[4],c[5]));break;case"rotate":s.rotate(c[0],c[1],c[2]);break;case"translate":s.translate(c[0],c[1]);break;case"scale":s.scale(c);break;case"skewX":s.skew(c[0],0);break;case"skewY":s.skew(0,c[0])}}t.transform(s)}}function v(t,e,i){var n="fill-opacity"===i?"getFillColor":"getStrokeColor",r=t[n]&&t[n]();r&&r.setAlpha(parseFloat(e))}function m(t,i,n){var s=t.attributes[i],a=s&&s.value;if(!a){var o=r.camelize(i);(a=t.style[o])||n.node[o]===n.parent[o]||(a=n.node[o])}return a?"none"===a?null:a:e}function b(t,i,n){if(i.style){var s=i.parentNode,a={node:H.getStyles(i)||{},parent:!n&&!/^defs$/i.test(s.tagName)&&H.getStyles(s)||{}};r.each(N,function(n,r){var s=m(i,r,a);t=s!==e&&n(t,s,r,i,a)||t})}return t}function P(t){var e=t&&t.match(/\((?:["'#]*)([^"')]+)/),n=e&&e[1],r=n&&k[i?n.replace(i.location.href.split("#")[0]+"#",""):n];return r&&r._scaleToBounds&&((r=r.clone())._scaleToBounds=!0),r}function M(t,e,i){var s,a,h,u=t.nodeName.toLowerCase(),l="#document"!==u,c=n.body;i&&l&&(z=paper.getView().getSize(),z=o(t,null,null,!0)||z,s=et.create("svg",{style:"stroke-width: 1px; stroke-miterlimit: 10"}),a=t.parentNode,h=t.nextSibling,s.appendChild(t),c.appendChild(s));var f=paper.settings,d=f.applyMatrix,_=f.insertItems;f.applyMatrix=!1,f.insertItems=!1;var g=O[u],v=g&&g(t,u,e,i)||null;if(f.insertItems=_,f.applyMatrix=d,v){!l||v instanceof x||(v=b(v,t,i));var p=e.onImport,m=l&&t.getAttribute("data-paper-data");p&&(v=p(t,v,e)||v),e.expandShapes&&v instanceof C&&(v.remove(),v=v.toPath()),m&&(v._data=JSON.parse(m))}return s&&(c.removeChild(s),a&&(h?a.insertBefore(t,h):a.appendChild(t))),i&&(k={},v&&r.pick(e.applyMatrix,d)&&v.matrix.apply(!0,!0)),v}function T(i,r,s){function a(n){try{var a="object"==typeof n?n:(new t.DOMParser).parseFromString(n,"image/svg+xml");if(!a.nodeName)throw a=null,new Error("Unsupported SVG source: "+i);paper=h,u=M(a,r,!0),r&&!1===r.insert||s._insertItem(e,u);var l=r.onLoad;l&&l(u,n)}catch(t){o(t)}}function o(t,e){var i=r.onError;if(!i)throw new Error(t);i(t,e)}if(!i)return null;r="function"==typeof r?{onLoad:r}:r||{};var h=paper,u=null;if("string"!=typeof i||/^.*</.test(i)){if("undefined"!=typeof File&&i instanceof File){var l=new FileReader;return l.onload=function(){a(l.result)},l.onerror=function(){o(l.error)},l.readAsText(i)}a(i)}else{var c=n.getElementById(i);c?a(c):K.request({url:i,async:!0,onLoad:a,onError:o})}return u}var z,k={},O={"#document":function(t,e,i,n){for(var r=t.childNodes,s=0,a=r.length;s<a;s++){var o=r[s];if(1===o.nodeType)return M(o,i,n)}},g:u,svg:u,clippath:u,polygon:l,polyline:l,path:function(t){return A.create(t.getAttribute("d"))},lineargradient:f,radialgradient:f,image:function(t){var e=new S(s(t,"href",!0));return e.on("load",function(){var e=o(t);this.setSize(e);var i=this._matrix._transformPoint(a(t).add(e.divide(2)));this.translate(i)}),e},symbol:function(t,e,i,n){return new I(u(t,e,i,n),!0)},defs:u,use:function(t){var e=(s(t,"href",!0)||"").substring(1),i=k[e],n=a(t);return i?i instanceof I?i.place(n):i.clone().translate(n):null},circle:function(t){return new C.Circle(a(t,"cx","cy"),s(t,"r"))},ellipse:function(t){return new C.Ellipse({center:a(t,"cx","cy"),radius:o(t,"rx","ry")})},rect:function(t){return new C.Rectangle(new g(a(t),o(t)),o(t,"rx","ry"))},line:function(t){return new L.Line(a(t,"x1","y1"),a(t,"x2","y2"))},text:function(t){var e=new E(a(t).add(a(t,"dx","dy")));return e.setContent(t.textContent.trim()||""),e}},N=r.set(r.each(it,function(t){this[t.attribute]=function(e,i){if(e[t.set]&&(e[t.set](h(i,t.type,t.fromSVG)),"color"===t.type)){var n=e[t.get]();if(n&&n._scaleToBounds){var r=e.getBounds();n.transform((new p).translate(r.getPoint()).scale(r.getSize()))}}}},{}),{id:function(t,e){k[e]=t,t.setName&&t.setName(e)},"clip-path":function(t,e){var i=P(e);if(i){if((i=i.clone()).setClipMask(!0),!(t instanceof x))return new x(i,t);t.insertChild(0,i)}},gradientTransform:_,transform:_,"fill-opacity":v,"stroke-opacity":v,visibility:function(t,e){t.setVisible&&t.setVisible("visible"===e)},display:function(t,e){t.setVisible&&t.setVisible(null!==e)},"stop-color":function(t,e){t.setColor&&t.setColor(e)},"stop-opacity":function(t,e){t._color&&t._color.setAlpha(parseFloat(e))},offset:function(t,e){if(t.setOffset){var i=e.match(/(.*)%$/);t.setOffset(i?i[1]/100:parseFloat(e))}},viewBox:function(t,e,i,n,r){var s,a=new g(h(e,"array")),u=o(n,null,null,!0);if(t instanceof x){var l=u?u.divide(a.getSize()):1,c=(new p).scale(l).translate(a.getPoint().negate());s=t}else t instanceof I&&(u&&a.setSize(u),s=t._item);if(s){if("visible"!==m(n,"overflow",r)){var f=new C.Rectangle(a);f.setClipMask(!0),s.addChild(f)}c&&s.transform(c)}}});w.inject({importSVG:function(t,e){return T(t,e,this)}}),y.inject({importSVG:function(t,e){return this.activate(),T(t,e,this)}})},(paper=new(a.inject(r.exports,{Base:r,Numerical:u,Key:$,DomEvent:Z,DomElement:H,document:n,window:i,Symbol:I,PlacedSymbol:P}))).agent.node&&require("./node/extend.js")(paper),"function"==typeof define&&define.amd?define("paper",paper):"object"==typeof module&&module&&(module.exports=paper),paper}.call(this,"object"==typeof self?self:null);/*
Script: RectanglePacker.js
	An algorithm implementation in JavaScript for rectangle packing.

Author:
	Iván Montes <drslump@drslump.biz>, <http://blog.netxus.es>

License:
	LGPL - Lesser General Public License

Credits:
	- Algorithm based on <http://www.blackpawn.com/texts/lightmaps/default.html>
*/

/*
	Class: NETXUS.RectanglePacker
	A class that finds an 'efficient' position for a rectangle inside another rectangle
	without overlapping the space already taken.
	
	Algorithm based on <http://www.blackpawn.com/texts/lightmaps/default.html>
	
	It uses a binary tree to partition the space of the parent rectangle and allocate the 
	passed rectangles by dividing the partitions into filled and empty.
*/


// Create a NETXUS namespace object if it doesn't exists
if (typeof NETXUS === 'undefined')
	var NETXUS = function() {};		
	

/*	
	Constructor: NETXUS.RectanglePacker
	Initializes the object with the given maximum dimensions
	
	Parameters:
	
		width - The containing rectangle maximum width as integer
		height - The containing rectangle maximum height as integer
		
*/	
NETXUS.RectanglePacker = function ( width, height ) {
	
	this.root = {};

	// initialize
	this.reset( width, height );	
}


/*
	Resets the object to its initial state by initializing the internal variables

	Parameters:
	
		width - The containing rectangle maximum width as integer
		height - The containing rectangle maximum height as integer
*/
NETXUS.RectanglePacker.prototype.reset = function ( width, height ) {
	this.root.x = 0;
	this.root.y = 0;
	this.root.w = width;
	this.root.h = height;
	delete this.root.lft;
	delete this.root.rgt;
	
	this.usedWidth = 0;
	this.usedHeight = 0;	
}
	

/*
	Returns the actual used dimensions of the containing rectangle.
	
	Returns:
	
		A object composed of the properties: 'w' for width and 'h' for height. 
*/
NETXUS.RectanglePacker.prototype.getDimensions = function () {
	return { w: this.usedWidth, h: this.usedHeight };	
}
	
	
/*
 	Finds a suitable place for the given rectangle
 	
	Parameters:
	
		w - The rectangle width as integer.
		h - The rectangle height as integer.
		
	Returns:
	
		If there is room for the rectangle then returns the coordinates as an object 
		composed of 'x' and 'y' properties. 
		If it doesn't fit returns null
*/  	
NETXUS.RectanglePacker.prototype.findCoords = function ( w, h ) {
	
	// private function to traverse the node tree by recursion
	function recursiveFindCoords ( node, w, h ) {

		// private function to clone a node coords and size
		function cloneNode ( node ) {
			return {
				x: node.x,
				y: node.y,
				w: node.w,
				h: node.h	
			};
		}		
		
		// if we are not at a leaf then go deeper
		if ( node.lft ) {
			// check first the left branch if not found then go by the right
			var coords = recursiveFindCoords( node.lft, w, h );
			return coords ? coords : recursiveFindCoords( node.rgt, w, h );	
		}
		else
		{
			// if already used or it's too big then return
			if ( node.used || w > node.w || h > node.h )
				return null;
				
			// if it fits perfectly then use this gap
			if ( w == node.w && h == node.h ) {
				node.used = true;
				return { x: node.x, y: node.y };
			}
			
			// initialize the left and right leafs by clonning the current one
			node.lft = cloneNode( node );
			node.rgt = cloneNode( node );
			
			// checks if we partition in vertical or horizontal
			if ( node.w - w > node.h - h ) {
				node.lft.w = w;
				node.rgt.x = node.x + w;
				node.rgt.w = node.w - w;	
			} else {
				node.lft.h = h;
				node.rgt.y = node.y + h;
				node.rgt.h = node.h - h;							
			}
			
			return recursiveFindCoords( node.lft, w, h );		
		}
	}
		
	// perform the search
	var coords = recursiveFindCoords( this.root, w, h );
	// if fitted then recalculate the used dimensions
	if (coords) {
		if ( this.usedWidth < coords.x + w )
			this.usedWidth = coords.x + w;
		if ( this.usedHeight < coords.y + h )
			this.usedHeight = coords.y + h;
	}
	return coords;
}

function UnionFind(count) {
	this.roots = new Array(count);
	this.ranks = new Array(count);
	
	for(var i=0; i<count; ++i) {
		this.roots[i] = i;
		this.ranks[i] = 0;
	}
}
// Two calls find(x) always return the same result, if link(..) has not been called in between (unique representatives)
UnionFind.prototype.find = function(x) {
	var x0 = x;
	var roots = this.roots;
	while(roots[x] != x)  x = roots[x];
  
	while(roots[x0] != x) {
		var y = roots[x0];
		roots[x0] = x;
		x0 = y;
	} 
	return x;
}

UnionFind.prototype.link = function(x, y) {
	var xr = this.find(x), yr = this.find(y);
	if(xr == yr)  return;

	var ranks = this.ranks, roots = this.roots, xd = ranks[xr], yd = ranks[yr];
 
	if     (xd < yd) {  roots[xr] = yr;  }
	else if(yd < xd) {  roots[yr] = xr;  }
	else {  roots[yr] = xr;  ++ranks[xr];  }
}

	
	
	var ICC = {};
	
	
	ICC.R = function(abuff)
	{
		var buff = new Uint8Array(abuff);
		return {
			header: ICC.R.parseHeader(buff, 0), 
		    tags: ICC.R.readTags(buff, 128)
		}
	}
	
	ICC.R.parseHeader = function(buff, offset) {
		var rA=ICC.B.readASCII, rU=ICC.B.readUint;
		var out = {}
		out.cmmType       = rA(buff, 4, 4);
		out.version       = buff[8]+"."+(buff[9]>>>4) + "."+(buff[9]&0x0f);
		out.profileClass  = rA(buff, 12, 4);
		out.spaceIn       = rA(buff, 16, 4);
		out.spaceOut      = rA(buff, 20, 4);
		out.date          = ICC.B.readUshort(buff, 24);
		for(var i=0; i<5; i++) out.date += "." + ICC.B.readUshort(buff, 26+2*i);
		out.platform      = rA(buff, 40, 4);
		out.flags         = rU(buff, 44);
		out.deviceManufac = rA(buff, 48, 4);
		out.deviceModel   = rU(buff, 52);
		out.deviceAttribs = [rU(buff, 56),rU(buff, 60) ];
		out.rendIntent    = rU(buff, 64);
		out.illuminant    = ICC.R.XYZNumber(buff, 68);
		out.creator       = rA(buff, 80, 4);
		
		return out;
	}
	
	ICC.R.readTags = function(buff, offset) {
		var rU=ICC.B.readUint, out = {};
		var tcount = rU(buff, offset);  offset+=4;
		for(var i=0; i<tcount; i++) {
			var sign = ICC.B.readASCII(buff, offset, 4);  offset+=4;
			var toff = rU(buff, offset);  offset+=4;
			var tsiz = rU(buff, offset);  offset+=4;
			//console.log(tcount, JSON.stringify(sign),toff,tsiz);
			out[sign] = ICC.R.Type(buff, toff, tsiz);
		}
		return out;
	}
	
	ICC.R.Type = function(buff, offset, size) {
		var type = ICC.B.readASCII(buff, offset, 4);
		var o = {class: type, _size:size};  offset+=4;
		offset+=4;
		
		if(type=="mluc") {
			var a = [];
			for(var i=0; i<size; i++) a.push(buff[offset-8+i]);
			//console.log(JSON.stringify(a));
		}
		
		if     (type=="mluc") ICC.R.multiLocalizedUnicodeType(o, buff, offset, size);
		else if(type=="text") ICC.R.textType(o, buff, offset, size);
		else if(type=="desc") ICC.R.textDescriptionType(o, buff, offset, size);
		else if(type=="mAB ") ICC.R.lutAToBType(o, buff, offset, size);
		else if(type=="mft1") ICC.R.lut8Type (o, buff, offset, size);
		/*
		else if(type=="sig ") ICC.R.signatureType(o, buff, offset, size);
		else if(type=="view") ICC.R.viewConditionsType(o, buff, offset, size);
		else if(type=="meas") ICC.R.measurementType(o, buff, offset, size);
		else if(type=="mft2") ICC.R.lut16Type(o, buff, offset, size);
		else if(type=="mBA ") ICC.R.lutBToAType(o, buff, offset, size);
		*/
		else if(type=="XYZ ") ICC.R.XYZType(o, buff, offset, size);
		else if(type=="para") ICC.R.parametricCurveType(o, buff, offset, size);
		else if(type=="curv") ICC.R.curveType(o, buff, offset, size);
		else if(type=="sf32") ICC.R.s15Fixed16ArrayType(o, buff, offset, size);
		else if(type!="pseq") {  console.log("unknown tag",type, offset, offset, size);  }
		
		if((o._size&3)!=0) o._size += 4-(o._size&3);
		return o;
	}
	ICC.R.multiLocalizedUnicodeType = function(out, buff, offset, size) {
		var poff = offset - 8;
		var B = ICC.B;
		
		var n  = B.readUint(buff, offset);  offset+=4;
		var rs = B.readUint(buff, offset);  offset+=4;
		out.values = [];
		for(var i=0; i<n; i++) {
			var obj = {};  out.values.push(obj);
			obj.code = B.readASCII(buff, offset, 4);
			var wlen = B.readUint(buff, offset+4); 
			var woff = B.readUint(buff, offset+8);  
			offset+=12;
			obj.text = B.readUnicodeRaw(buff, poff+woff, wlen>>>1);
		}
	}
	ICC.R.textDescriptionType = function(out, buff, offset, size) {
		var B = ICC.B;
		var n = B.readUint(buff, offset);  offset+=4;
		
		out.ascii = B.readASCII(buff, offset, n-1);   offset+=n;
		var ulcode = B.readUint(buff, offset);  offset+=4;  
		var m = B.readUint(buff, offset);  offset+=4;
		out.unicode = B.readUnicodeRaw(buff, offset, m);  offset+=m;
		
		var scode = B.readUshort(buff, offset);  offset+=2;
		var mlen = buff[offset];  offset++;
		out.macintosh = B.readASCII(buff, offset, mlen);
	}
	
	ICC.R.lutAToBType = function(out, buff, offset, size)
	{
		var poff = offset-8;
		var B = ICC.B;
		
		out.i = buff[offset];  offset++;
		out.o = buff[offset];  offset++;
		offset+=2;
		
		var offBc = B.readUint(buff, offset);  offset+=4;
		var offMa = B.readUint(buff, offset);  offset+=4;
		var offMc = B.readUint(buff, offset);  offset+=4;
		var offCL = B.readUint(buff, offset);  offset+=4;
		var offAc = B.readUint(buff, offset);  offset+=4;
		//console.log(offBc, offMa, offMc, offCL, offAc);
		
		if(offBc!=0) {
			out.B = [];  offset = poff+offBc;
			for(var i=0; i<out.o; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.B.push(c);  }
		}
		if(offMa!=0) {
			out.matrix = [];
			for(var i=0; i<12; i++) out.matrix.push( ICC.R.s15Fixed16Number( buff, poff + offMa + i*4 ) );  
		}
		
		if(offMc!=0) {
			out.M = [];  offset = poff+offMc;
			for(var i=0; i<out.o; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.M.push(c);  }
		}
		
		if(offCL!=0)  {
			out.CLUT = [];  offset = poff+offCL;
			out.gpnum = [];
			for(var i=0; i<out.i; i++) out.gpnum.push(buff[offset+i]);      offset+=16;
			var prec = buff[offset];   offset+=4;
			var len = out.o;
			for(var i=0; i<out.i; i++) len *= out.gpnum[i];
			
			if(prec==1) for(var i=0; i<len; i++) out.CLUT.push( buff[offset+i]*(1/255) );
			if(prec==2) for(var i=0; i<len; i++) out.CLUT.push( B.readUshort(buff, offset+2*i)*(1/65535) );
		}
		if(offAc!=0) {
			out.A = [];  offset = poff+offAc;
			for(var i=0; i<out.i; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.A.push(c);  }
		}
	}
	// (matrix) ⇒ (1d input tables) ⇒ (multidimensional lookup table - CLUT) ⇒ (1d output tables)
	ICC.R.lut8Type = function(out, buff, offset, size)
	{	
		var B = ICC.B;
		ICC.R._lutType(out, buff, offset);
		offset += 40;
		
		out.inTab = ICC.R.table2D8(buff, offset, out.i, 256);
		offset += out.i*256;
		
		out.CLUT = [];
		var clutl = Math.round(Math.pow(out.g, out.i))*out.o;
		for(var i=0; i<clutl; i++) out.CLUT.push( buff[offset+i]*(1/255) );
		offset += clutl;
		
		out.outTab = ICC.R.table2D8(buff, offset, out.o, 256);
		offset += out.o*256;
	}
	ICC.R._lutType = function(out, buff, offset) {
		var B = ICC.B;
			
		out.i = buff[offset];  offset++;
		out.o = buff[offset];  offset++;
		out.g = buff[offset];  offset++;
		offset++;
		
		out.matrix = [];
		for(var i=0; i<9; i++) { out.matrix.push( ICC.R.s15Fixed16Number( buff, offset ) );   offset+=4; }
	}
	ICC.R.table2D8 = function(buff, offset, m, n) {
		var out = [];
		for(var i=0; i<m; i++) { 
			var arr = [];  out.push(arr);
			for(var j=0; j<n; j++)  { arr.push( buff[offset] );   offset++; }
		}
		return out;
	}
	
	/*
	ICC.R.lutBToAType = function(out, buff, offset, size)
	{
		var poff = offset-8;
		var B = ICC.B;
		
		out.i = buff[offset];  offset++;
		out.o = buff[offset];  offset++;
		offset+=2;
		
		var offBc = B.readUint(buff, offset);  offset+=4;
		var offMa = B.readUint(buff, offset);  offset+=4;
		var offMc = B.readUint(buff, offset);  offset+=4;
		var offCL = B.readUint(buff, offset);  offset+=4;
		var offAc = B.readUint(buff, offset);  offset+=4;
		//console.log(offBc, offMa, offMc, offCL, offAc);
		
		if(offBc!=0)
		{
			out.B = [];  offset = poff+offBc;
			for(var i=0; i<out.i; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.B.push(c);  }
		}
		out.matrix = [];
		for(var i=0; i<12; i++) out.matrix.push( ICC.R.s15Fixed16Number( buff, poff + offMa + i*4 ) );  
		
		if(offMc!=0)
		{
			out.M = [];  offset = poff+offMc;
			for(var i=0; i<out.i; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.M.push(c);  }
		}
		
		if(offCL!=0) 
		{
			out.CLUT = [];  offset = poff+offCL;
			out.gpnum = [];
			for(var i=0; i<out.i; i++) out.gpnum.push(buff[offset+i]);      offset+=16;
			var prec = buff[offset];   offset+=4;
			var len = out.o;
			for(var i=0; i<out.i; i++) len *= out.gpnum[i];
			
			if(prec==1) for(var i=0; i<len; i++) out.CLUT.push( buff[offset+i] );
			if(prec==2) for(var i=0; i<len; i++) out.CLUT.push( B.readUshort(buff, offset+2*i) );
		}
		if(offAc!=0)
		{
			out.A = [];  offset = poff+offAc;
			for(var i=0; i<out.o; i++) {  var c = ICC.R.Type(buff, offset, 0);  offset += c._size;  out.A.push(c);  }
		}
	}
	
	
	// (matrix) ⇒ (1d input tables) ⇒ (multidimensional lookup table - CLUT) ⇒ (1d output tables). 
	ICC.R.lut16Type = function(out, buff, offset, size)
	{	
		var B = ICC.B;
		ICC.R._lutType(out, buff, offset);
		offset += 40;
		
		out.n = B.readUshort(buff, offset);  offset+=2;
		out.m = B.readUshort(buff, offset);  offset+=2;
		
		out.inTab = ICC.R.table2D16(buff, offset, out.i, out.n);
		offset += 2*out.i*out.n;
		
		out.CLUT = [];
		var clutl = Math.round(Math.pow(out.g, out.i))*out.o;
		for(var i=0; i<clutl; i++) out.CLUT.push( B.readUshort(buff, offset+i*2) );
		offset += clutl * 2;
		
		out.outTab = ICC.R.table2D16(buff, offset, out.o, out.m);
		offset += 2*out.o*out.m;
	}
	
	ICC.R.table2D16 = function(buff, offset, m, n)
	{
		var out = [];
		for(var i=0; i<m; i++) 
		{ 
			var arr = [];  out.push(arr);
			for(var j=0; j<n; j++)  { arr.push( ICC.B.readUshort(buff, offset) );   offset+=2; }
		}
		return out;
	}
	
	ICC.R.measurementType = function(out, buff, offset, size)
	{
		var B = ICC.B;
		out.observer = B.readUint(buff, offset);  offset+=4;
		out.backing = ICC.R.XYZNumber(buff, offset);   offset+=12;
		out.geometry = B.readUint(buff, offset);  offset+=4;
		out.flare = B.readUint(buff, offset);  offset+=4;
		out.illuminant = B.readUint(buff, offset);  offset+=4;
	}
	
	ICC.R.signatureType = function(out, buff, offset, size)
	{
		out.value = ICC.B.readASCII(buff, offset, 4);
	}
	
	ICC.R.viewConditionsType = function(out, buff, offset, size)
	{
		var B = ICC.B;
		out.illuminant = ICC.R.XYZNumber(buff, offset);  offset+=12;
		out.surround   = ICC.R.XYZNumber(buff, offset);  offset+=12;
		out.illType   = B.readUint(buff, offset);
	}
	
	ICC.R.s15Fixed16ArrayType = function(out, buff, offset, size)
	{
		var B = ICC.B;
		var len = (size/4)-2;    out.values = [];
		for(var i=0; i<len; i++) out.values.push( ICC.R.s15Fixed16Number(buff, offset + i*4) );
	}
	
	
	

	ICC.R.u8Fixed8Number = function(buff, p)
	{
		return buff[p] + (buff[p+1]/256);
	}
	*/
	ICC.R.parametricCurveType = function(out, buff, offset, size) {
		var B = ICC.B;
		out.ftype = B.readUshort(buff, offset);  offset+=2;
		offset+=2;
		
		var plens = [1,3,4,5,7];
		out.pars = [];
		for(var i=0; i<plens[out.ftype]; i++) out.pars.push( ICC.R.s15Fixed16Number(buff, offset + i*4) );
	}
	ICC.R.curveType = function(out, buff, offset, size) {
		var B = ICC.B;
		var n = B.readUint(buff, offset);  offset+=4;
		out.values = [];
		if(n==1) out.values.push(ICC.R.u8Fixed8Number(buff, offset));
		else for(var i=0; i<n; i++) out.values.push(B.readUshort(buff, offset+i*2));
		out._size = 12+2*n;
	}
	
	ICC.R.XYZType = function(out, buff, offset)  {  out.value = ICC.R.XYZNumber(buff, offset);  }
	ICC.R.textType = function(out, buff, offset, size)  {  out.value = ICC.B.readASCII(buff, offset, size-9);  }
	ICC.R.s15Fixed16Number = function(buff, p)
	{
		return ICC.B.readShort(buff, p) + (ICC.B.readUshort(buff, p+2)*(1/0x10000));
	}
	ICC.R.XYZNumber = function(buff, p)
	{
		var out = [];
		for(var i=0; i<3; i++) out.push(  ICC.R.s15Fixed16Number(buff, p+i*4)   );
		return out;
	}
	
	
	ICC.B = {};
	ICC.B._short = new Int16Array(1);
	ICC.B._short8 = new Uint8Array(ICC.B._short.buffer);
	
	
	ICC.B.readUshort = function(buff, p) {  return (buff[p]<<8) | buff[p+1];  }
	ICC.B.readShort  = function(buff, p) {
		ICC.B._short8[0] = buff[p+1];
		ICC.B._short8[1] = buff[p];
		return ICC.B._short[0];
	}
	ICC.B.readUint = function(buff, p) { return (buff[p]<<24) | (buff[p+1]<<16) | (buff[p+2]<<8) | buff[p+3];  }
	
	
	ICC.B.readASCII = function(buff, p, l) { // l : length in Characters (not Bytes)
	
		var s = "";
		for(var i = 0; i < l; i++)s += String.fromCharCode(buff[p+i]);
		return s;
	}
	ICC.B.readASCIIArray = function(buff, p, l)	{  // l : length in Characters (not Bytes)
		var s = [];
		for(var i = 0; i < l; i++)	
			s.push(String.fromCharCode(buff[p+i]));
		return s;
	}
	ICC.B.readUnicodeRaw = function(buff, p, l) {
		var s = "";
		for(var i = 0; i < l; i++) {
			var c = (buff[p++]<<8) | buff[p++];
			s += String.fromCharCode(c);
		}
		return s;
	}
	ICC.U = {};
	
	ICC.U.sampleLUT = function(icc, N) {
		var N3 = N*N*N, N33=N3*3, imN = 1/(N-1), tab = [];
		for(var r=0; r<N; r++) 
			for(var g=0; g<N; g++)
				for(var b=0; b<N; b++) tab.push(r*imN,g*imN,b*imN);
		
		var a2b = icc["tags"]["A2B0"];
		var sin = icc.header.spaceIn.toLowerCase();  //console.log(sin);
		
		if(a2b.class=="mAB ") {			
			var m = a2b.matrix;
			var M = (a2b.M && a2b.M[0].values.length>1) ? a2b.M : null;
			for(var i=0; i<N33; i+=3) {
				// M before matrix
				if(M) ICC.U.doCurv(tab, i, M);
				
				ICC.U.doLUT (tab, i, a2b.CLUT, a2b.gpnum[0]);		
				if(a2b.matrix) ICC.U.doMatx(tab, i, a2b.matrix);
			}
		}
		else if(a2b.class=="mft1") {
			if(sin=="rgb ")
			for(var i=0; i<N33; i+=3) {
				ICC.U.doLUT (tab, i, a2b.CLUT, a2b.g);	
			}
			else
			for(var i=0; i<N33; i+=3) {
				var lab = ICC.C.rgbToLab(tab[i]*255, tab[i+1]*255, tab[i+2]*255);
				tab[i  ]=lab.L/100;
				tab[i+1]=(128+lab.a)/255;
				tab[i+2]=(128+lab.b)/255;
				ICC.U.doLUT (tab, i, a2b.CLUT, a2b.g);	
				var rgb = ICC.C.labToRgb(tab[i]*100, -128+255*tab[i+1], -128+255*tab[i+2]);
				tab[i  ]=rgb.r/255;
				tab[i+1]=rgb.g/255;
				tab[i+2]=rgb.b/255;
			}
		}
		
		return tab;
	}
	ICC.U.doMatx = function(tab,i,m) {
		var c0 = tab[i], c1 = tab[i+1], c2 = tab[i+2];
		tab[i  ]=Math.max(0, Math.min(1, m[0]*c0 + m[1]*c1 + m[2]*c2 + m[ 9])); 
		tab[i+1]=Math.max(0, Math.min(1, m[3]*c0 + m[4]*c1 + m[5]*c2 + m[10])); 
		tab[i+2]=Math.max(0, Math.min(1, m[6]*c0 + m[7]*c1 + m[8]*c2 + m[11]));
	}
	ICC.U.doCurv = function(tab,i,A) {
		tab[i  ]=ICC.U.curv(tab[i  ], A[0].values);
		tab[i+1]=ICC.U.curv(tab[i+1], A[1].values);
		tab[i+2]=ICC.U.curv(tab[i+2], A[2].values);
	}
	ICC.U.curv = function(v, crv) {
		var N = crv.length;
		var fv = v * (N-1) * 0.99999;
		var iv = ~~fv;
		var f = fv-iv;
		return ((1-f) * crv[iv] + f * crv[iv+1])*(1/65535);
	}
	
	ICC.U.doLUT = function(tab, i, CLUT, N) {
		var intp0=ICC.U.intp0, intp1=ICC.U.intp1;
		var cls = [0,0,0,  0,0,0,  0,0,0,  0,0,0];
		var Nn = (N-1.000001);
			
		var r = Nn*tab[i+0];
		var g = Nn*tab[i+1];
		var b = Nn*tab[i+2];
		var ir=~~r, ig=~~g, ib=~~b;
			
		intp0(3*(ib + N*(ig  ) + N*N*(ir  )), 3*(ib+1 + N*(ig  ) + N*N*(ir  )), CLUT, b-ib, 0, cls);
		intp0(3*(ib + N*(ig+1) + N*N*(ir  )), 3*(ib+1 + N*(ig+1) + N*N*(ir  )), CLUT, b-ib, 3, cls);
		intp0(0, 3, cls, g-ig, 6, cls);
		intp0(3*(ib + N*(ig  ) + N*N*(ir+1)), 3*(ib+1 + N*(ig  ) + N*N*(ir+1)), CLUT, b-ib, 0, cls);
		intp0(3*(ib + N*(ig+1) + N*N*(ir+1)), 3*(ib+1 + N*(ig+1) + N*N*(ir+1)), CLUT, b-ib, 3, cls);
		intp0(0, 3, cls, g-ig, 9, cls);
		intp0(6, 9, cls, r-ir, 0, cls);
				
		tab[i  ]=cls[0];
		tab[i+1]=cls[1];
		tab[i+2]=cls[2];
		//*/
	}
	
	ICC.U.intp0 = function(i0,i1,tb,frc,io,out) {
		var ifrc=1-frc;
		out[io+0] = ifrc*tb[i0  ] + frc*tb[i1  ];
		out[io+1] = ifrc*tb[i0+1] + frc*tb[i1+1];
		out[io+2] = ifrc*tb[i0+2] + frc*tb[i1+2];
	}
	
	ICC.U.rgba8LUT = function(tab, N) {
		var vol = N*N*N;
		var buf = new Uint8Array(vol*4);
		for(var i=0; i<vol; i++) {
			var ti = i*3, qi=ti+i;
			var r = Math.max(0, Math.min(1, tab[ti  ]));
			var g = Math.max(0, Math.min(1, tab[ti+1]));
			var b = Math.max(0, Math.min(1, tab[ti+2]));
			buf[qi  ] = ~~(0.5+r*255);
			buf[qi+1] = ~~(0.5+g*255);
			buf[qi+2] = ~~(0.5+b*255);  buf[qi+3]=255;
			tab[ti  ] = r;
			tab[ti+1] = g;
			tab[ti+2] = b;
		}
		return buf;
	}
	
	ICC.C = {
		xyz2srgb : [3.1338561, -1.6168667, -0.4906146, -0.9787684,  1.9161415, 0.0334540, 0.0719453, -0.2289914,  1.4052427],
		srgb2xyz : [0.4360747,  0.3850649, 0.14308038,  0.2225045,  0.7168786, 0.0606169, 0.0139322,  0.0971045,  0.7141733],
		srgbGamma  : function (x) {  return x < 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055;  },
		srgbUngamma: function (x) {  return x < 0.04045   ? x / 12.92 : Math.pow( ( x + 0.055 ) / 1.055,  2.4);  },
		
		rgbToLab : function(r, g, b){	// 0 .. 255  
			var ung = ICC.C._r2lMap[0], cnv = ICC.C._r2lMap[1];
			r = ung[~~(r*(1000/255))];
			g = ung[~~(g*(1000/255))];
			b = ung[~~(b*(1000/255))];
			
			var m = ICC.C.srgb2xyz;
			var x=m[0]*r + m[1]*g + m[2]*b;
			var y=m[3]*r + m[4]*g + m[5]*b;
			var z=m[6]*r + m[7]*g + m[8]*b;
			
			x=x*(100/96.72);  y=y*(100/100);  z=z*(100/81.427);
			
			return ICC.C.xyzToLab(x,y,z);
		},
		xyzToLab : function(x,y,z) {
			var cnv = ICC.C._r2lMap[1];
			var fx = cnv[~~(x*1000)];
			var fy = cnv[~~(y*1000)];
			var fz = cnv[~~(z*1000)];
			
			return {L:116*fy-16, a:500*(fx-fy), b:200*(fy-fz)};
		},
	
		labToRgb : function(L,a,b) {
			//var L = lab[0], a = lab[1], b = lab[2];
			var k = 903.3, e = 0.008856;
			var fy = (L+16)/116, fy3 = fy*fy*fy;
			var fz = fy - b/200, fz3 = fz*fz*fz;
			var fx = a/500 + fy, fx3 = fx*fx*fx;
			var zr = fz3>e ? fz3 : (116*fz-16)/k;
			var yr = fy3>e ? fy3 : (116*fy-16)/k;
			var xr = fx3>e ? fx3 : (116*fx-16)/k;
						
			var X = xr*96.72, Y = yr*100, Z = zr*81.427;
				
			var r=X/100,g=Y/100,b=Z/100;
			var m = ICC.C.xyz2srgb;
			var rgb = [ m[0]*r + m[1]*g + m[2]*b,
						m[3]*r + m[4]*g + m[5]*b,
						m[6]*r + m[7]*g + m[8]*b ];
			
			for(var i=0; i<3; i++) rgb[i] = Math.max(0, Math.min(255, ICC.C.srgbGamma(rgb[i])*255));
			return {r:rgb[0],g:rgb[1],b:rgb[2]};
		}
	};
	ICC.C._r2lMap = function() {
		var a = [], b = [];
		for(var i=0; i<2000; i++) {
			var x = i/1000;
			a[i]=ICC.C.srgbUngamma(x);
			b[i]=x>0.008856 ? Math.pow(x,1/3) : (903.3*x+16)*(1/116)
		}
		return [a,b];
	}();function hbjs(instance) {
  'use strict';

  var exports = instance.exports;
  var heapu8 = new Uint8Array(exports.memory.buffer);
  var heapu32 = new Uint32Array(exports.memory.buffer);
  var heapi32 = new Int32Array(exports.memory.buffer);

  var HB_MEMORY_MODE_WRITABLE = 2;

  function createBlob(blob) {
    var blobPtr = exports.malloc(blob.byteLength);
    heapu8.set(blob, blobPtr);
    var ptr = exports.hb_blob_create(blobPtr, blob.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
    return {
      ptr: ptr,
      free: function () {
        exports.hb_blob_destroy(ptr);
        exports.free(blobPtr);
      }
    };
  }
  
  function createFace(blob, index) {
    var ptr = exports.hb_face_create(blob.ptr, index);
    return {
      ptr: ptr,
      free: function () { exports.hb_face_destroy(ptr); }
    };
  }

  function createFont(face) {
    var ptr = exports.hb_font_create(face.ptr);
    return {
      ptr: ptr,
      setScale: function (xScale, yScale) {
        exports.hb_font_set_scale(ptr, xScale, yScale);
      },
      free: function () { exports.hb_font_destroy(ptr); }
    };
  }

  function createCString(bytes) {
    var ptr = exports.malloc(bytes.byteLength);
    heapu8.set(bytes, ptr);
    return {
      ptr: ptr,
      length: bytes.byteLength,
      free: function () { exports.free(ptr); }
    };
  }

  function createBuffer() {
    var ptr = exports.hb_buffer_create();
    return {
      ptr: ptr,
      addText: function (bytes) {
        var str = createCString(bytes);
        exports.hb_buffer_add_utf8(ptr, str.ptr, str.length, 0, str.length);
        str.free();
      },
      guessSegmentProperties: function () {
        return exports.hb_buffer_guess_segment_properties(ptr);
      },
      setDirection: function (dir) {
        exports.hb_buffer_set_direction(ptr, {
          ltr: 4,
          rtl: 5,
          ttb: 6,
          btt: 7
        }[dir] || 0);
      },
      shape: function (font, features) {
        // features are not used yet
        exports.hb_shape(font.ptr, ptr, 0, 0);
      },
      json: function (font) {
        var length = exports.hb_buffer_get_length(ptr);
        var result = [];
        var infosPtr32 = exports.hb_buffer_get_glyph_infos(ptr, 0) / 4;
        var positionsPtr32 = exports.hb_buffer_get_glyph_positions(ptr, 0) / 4;
        var infos = heapu32.slice(infosPtr32, infosPtr32 + 5 * length);
        var positions = heapi32.slice(positionsPtr32, positionsPtr32 + 5 * length);
        for (var i = 0; i < length; ++i) {
          result.push({
            g: infos[i * 5 + 0],
            cl: infos[i * 5 + 2],
            ax: positions[i * 5 + 0],
            ay: positions[i * 5 + 1],
            dx: positions[i * 5 + 2],
            dy: positions[i * 5 + 3]
          });
        }
        return result;
      },
      free: function () { exports.hb_buffer_destroy(ptr); }
    };
  }

  return {
    createBlob: createBlob,
    createFace: createFace,
    createFont: createFont,
    createBuffer: createBuffer
  };
};

// Should be replaced with something more reliable
try { module.exports = hbjs; } catch(e) {}
/*
 * [js-sha1]{@link https://github.com/emn178/js-sha1}
 *
 * @version 0.6.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
!function(){"use strict";function t(t){t?(f[0]=f[16]=f[1]=f[2]=f[3]=f[4]=f[5]=f[6]=f[7]=f[8]=f[9]=f[10]=f[11]=f[12]=f[13]=f[14]=f[15]=0,this.blocks=f):this.blocks=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],this.h0=1732584193,this.h1=4023233417,this.h2=2562383102,this.h3=271733878,this.h4=3285377520,this.block=this.start=this.bytes=this.hBytes=0,this.finalized=this.hashed=!1,this.first=!0}var h="object"==typeof window?window:{},s=!h.JS_SHA1_NO_NODE_JS&&"object"==typeof process&&process.versions&&process.versions.node;s&&(h=global);var i=!h.JS_SHA1_NO_COMMON_JS&&"object"==typeof module&&module.exports,e="function"==typeof define&&define.amd,r="0123456789abcdef".split(""),o=[-2147483648,8388608,32768,128],n=[24,16,8,0],a=["hex","array","digest","arrayBuffer"],f=[],u=function(h){return function(s){return new t(!0).update(s)[h]()}},c=function(){var h=u("hex");s&&(h=p(h)),h.create=function(){return new t},h.update=function(t){return h.create().update(t)};for(var i=0;i<a.length;++i){var e=a[i];h[e]=u(e)}return h},p=function(t){var h=eval("require('crypto')"),s=eval("require('buffer').Buffer"),i=function(i){if("string"==typeof i)return h.createHash("sha1").update(i,"utf8").digest("hex");if(i.constructor===ArrayBuffer)i=new Uint8Array(i);else if(void 0===i.length)return t(i);return h.createHash("sha1").update(new s(i)).digest("hex")};return i};t.prototype.update=function(t){if(!this.finalized){var s="string"!=typeof t;s&&t.constructor===h.ArrayBuffer&&(t=new Uint8Array(t));for(var i,e,r=0,o=t.length||0,a=this.blocks;r<o;){if(this.hashed&&(this.hashed=!1,a[0]=this.block,a[16]=a[1]=a[2]=a[3]=a[4]=a[5]=a[6]=a[7]=a[8]=a[9]=a[10]=a[11]=a[12]=a[13]=a[14]=a[15]=0),s)for(e=this.start;r<o&&e<64;++r)a[e>>2]|=t[r]<<n[3&e++];else for(e=this.start;r<o&&e<64;++r)(i=t.charCodeAt(r))<128?a[e>>2]|=i<<n[3&e++]:i<2048?(a[e>>2]|=(192|i>>6)<<n[3&e++],a[e>>2]|=(128|63&i)<<n[3&e++]):i<55296||i>=57344?(a[e>>2]|=(224|i>>12)<<n[3&e++],a[e>>2]|=(128|i>>6&63)<<n[3&e++],a[e>>2]|=(128|63&i)<<n[3&e++]):(i=65536+((1023&i)<<10|1023&t.charCodeAt(++r)),a[e>>2]|=(240|i>>18)<<n[3&e++],a[e>>2]|=(128|i>>12&63)<<n[3&e++],a[e>>2]|=(128|i>>6&63)<<n[3&e++],a[e>>2]|=(128|63&i)<<n[3&e++]);this.lastByteIndex=e,this.bytes+=e-this.start,e>=64?(this.block=a[16],this.start=e-64,this.hash(),this.hashed=!0):this.start=e}return this.bytes>4294967295&&(this.hBytes+=this.bytes/4294967296<<0,this.bytes=this.bytes%4294967296),this}},t.prototype.finalize=function(){if(!this.finalized){this.finalized=!0;var t=this.blocks,h=this.lastByteIndex;t[16]=this.block,t[h>>2]|=o[3&h],this.block=t[16],h>=56&&(this.hashed||this.hash(),t[0]=this.block,t[16]=t[1]=t[2]=t[3]=t[4]=t[5]=t[6]=t[7]=t[8]=t[9]=t[10]=t[11]=t[12]=t[13]=t[14]=t[15]=0),t[14]=this.hBytes<<3|this.bytes>>>29,t[15]=this.bytes<<3,this.hash()}},t.prototype.hash=function(){var t,h,s=this.h0,i=this.h1,e=this.h2,r=this.h3,o=this.h4,n=this.blocks;for(t=16;t<80;++t)h=n[t-3]^n[t-8]^n[t-14]^n[t-16],n[t]=h<<1|h>>>31;for(t=0;t<20;t+=5)s=(h=(i=(h=(e=(h=(r=(h=(o=(h=s<<5|s>>>27)+(i&e|~i&r)+o+1518500249+n[t]<<0)<<5|o>>>27)+(s&(i=i<<30|i>>>2)|~s&e)+r+1518500249+n[t+1]<<0)<<5|r>>>27)+(o&(s=s<<30|s>>>2)|~o&i)+e+1518500249+n[t+2]<<0)<<5|e>>>27)+(r&(o=o<<30|o>>>2)|~r&s)+i+1518500249+n[t+3]<<0)<<5|i>>>27)+(e&(r=r<<30|r>>>2)|~e&o)+s+1518500249+n[t+4]<<0,e=e<<30|e>>>2;for(;t<40;t+=5)s=(h=(i=(h=(e=(h=(r=(h=(o=(h=s<<5|s>>>27)+(i^e^r)+o+1859775393+n[t]<<0)<<5|o>>>27)+(s^(i=i<<30|i>>>2)^e)+r+1859775393+n[t+1]<<0)<<5|r>>>27)+(o^(s=s<<30|s>>>2)^i)+e+1859775393+n[t+2]<<0)<<5|e>>>27)+(r^(o=o<<30|o>>>2)^s)+i+1859775393+n[t+3]<<0)<<5|i>>>27)+(e^(r=r<<30|r>>>2)^o)+s+1859775393+n[t+4]<<0,e=e<<30|e>>>2;for(;t<60;t+=5)s=(h=(i=(h=(e=(h=(r=(h=(o=(h=s<<5|s>>>27)+(i&e|i&r|e&r)+o-1894007588+n[t]<<0)<<5|o>>>27)+(s&(i=i<<30|i>>>2)|s&e|i&e)+r-1894007588+n[t+1]<<0)<<5|r>>>27)+(o&(s=s<<30|s>>>2)|o&i|s&i)+e-1894007588+n[t+2]<<0)<<5|e>>>27)+(r&(o=o<<30|o>>>2)|r&s|o&s)+i-1894007588+n[t+3]<<0)<<5|i>>>27)+(e&(r=r<<30|r>>>2)|e&o|r&o)+s-1894007588+n[t+4]<<0,e=e<<30|e>>>2;for(;t<80;t+=5)s=(h=(i=(h=(e=(h=(r=(h=(o=(h=s<<5|s>>>27)+(i^e^r)+o-899497514+n[t]<<0)<<5|o>>>27)+(s^(i=i<<30|i>>>2)^e)+r-899497514+n[t+1]<<0)<<5|r>>>27)+(o^(s=s<<30|s>>>2)^i)+e-899497514+n[t+2]<<0)<<5|e>>>27)+(r^(o=o<<30|o>>>2)^s)+i-899497514+n[t+3]<<0)<<5|i>>>27)+(e^(r=r<<30|r>>>2)^o)+s-899497514+n[t+4]<<0,e=e<<30|e>>>2;this.h0=this.h0+s<<0,this.h1=this.h1+i<<0,this.h2=this.h2+e<<0,this.h3=this.h3+r<<0,this.h4=this.h4+o<<0},t.prototype.hex=function(){this.finalize();var t=this.h0,h=this.h1,s=this.h2,i=this.h3,e=this.h4;return r[t>>28&15]+r[t>>24&15]+r[t>>20&15]+r[t>>16&15]+r[t>>12&15]+r[t>>8&15]+r[t>>4&15]+r[15&t]+r[h>>28&15]+r[h>>24&15]+r[h>>20&15]+r[h>>16&15]+r[h>>12&15]+r[h>>8&15]+r[h>>4&15]+r[15&h]+r[s>>28&15]+r[s>>24&15]+r[s>>20&15]+r[s>>16&15]+r[s>>12&15]+r[s>>8&15]+r[s>>4&15]+r[15&s]+r[i>>28&15]+r[i>>24&15]+r[i>>20&15]+r[i>>16&15]+r[i>>12&15]+r[i>>8&15]+r[i>>4&15]+r[15&i]+r[e>>28&15]+r[e>>24&15]+r[e>>20&15]+r[e>>16&15]+r[e>>12&15]+r[e>>8&15]+r[e>>4&15]+r[15&e]},t.prototype.toString=t.prototype.hex,t.prototype.digest=function(){this.finalize();var t=this.h0,h=this.h1,s=this.h2,i=this.h3,e=this.h4;return[t>>24&255,t>>16&255,t>>8&255,255&t,h>>24&255,h>>16&255,h>>8&255,255&h,s>>24&255,s>>16&255,s>>8&255,255&s,i>>24&255,i>>16&255,i>>8&255,255&i,e>>24&255,e>>16&255,e>>8&255,255&e]},t.prototype.array=t.prototype.digest,t.prototype.arrayBuffer=function(){this.finalize();var t=new ArrayBuffer(20),h=new DataView(t);return h.setUint32(0,this.h0),h.setUint32(4,this.h1),h.setUint32(8,this.h2),h.setUint32(12,this.h3),h.setUint32(16,this.h4),t};var y=c();i?module.exports=y:(h.sha1=y,e&&define(function(){return y}))}();