var DIRECTION_UP = -1;
var DIRECTION_DOWN = 1;
var TYPE_SLINKY = 0;
var TYPE_JUMP = 1;
var TYPE_ROLL = 2;
var TYPE_TEAPOT = 3;
var TYPE_macbook = 4;
var NUM_TYPES = 5;

var DEFAULT_NUM_SPROINGIES = 13;
var DEFAULT_SPEED = 10;
var DEFAULT_GROUND = 2;
var DEFAULT_WEIRDNESS = 4;
var DEFAULT_TYPE = TYPE_SLINKY;

var HERO_SPEED_JUMPING = 4;
var HERO_SPEED_NOT_JUMPING = 2;

var CAMERA_SLIDE_RATE = 0.998;
var BOOM_STAGE = 50.0;
var S_RES = 28;
var M_TWOPI = Math.PI * 2.0;
var DegToRad = Math.PI / 180.0;

// Bits for m_weirdBits field in Sproingies.
var SP_BIT_AIRDROP = 1;
var SP_BIT_STRIPES = 2;
var SP_BIT_FAT = 4;

var sproingieList = [];
var mouseDown = -1;
var lastMouseX = 0;
var lastMouseY = 0;
var target_wait = 0.0001,
	max_target_wait = 100.0;
var ground = 0.0,
	rotx = 0.0,
	roty = -45.0,
	dist = 32.0;
var target_rx = 0.0,
	target_ry = -45.0,
	target_dist = 32.0;
var lookAway = 1.5;
var looking = -0.5;
var howfast = DEFAULT_SPEED;
var groundlevel = DEFAULT_GROUND;
var weirdness = DEFAULT_WEIRDNESS;

var KILL_ALL = false;
var LevelTimer;

var gl; // the WebGL context
var glCanvasName = "glCanvas";

var MAX_TOOLBAR_LIFE = 5;
var TOOLBAR_FADE_SPEED = 500;
var toolbarLife = MAX_TOOLBAR_LIFE;
var toolbarVisible = true;
var fpsFrames = 0,
	fpsTime = 0;
var lastTime = 0;
var isPaused = false;

var groundBuffers;
var sproingieBuffers;
var teapotBuffers;
var macbookBuffers;
var sproingieBoomBuffers;
var sproingieExplodeBuffers;
var groundShaderProgram;
var sproingieShaderProgram;
var tpshaderProgram;
var macbookshaderProgram;
var sproingieBoomShaderProgram;
var sproingieExplodeShaderProgram;
var dotTexture;
var pointLifetimesBuffer;
var pointStartPositionsBuffer;
var pointEndPositionsBuffer;
var pointOffsetsBuffer;
var pointTextureCoordsBuffer;

var color = [Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, 0.5];
var colorTime = 0;
var groundRGB = [0.156863, 0.156863, 0.392157];
var nextGroundRGB = [0.156863, 0.156863, 0.392157];

var worldWidth = 8;
var worldHeight = 3;

var BOXINESS = 0;

var gameLevel = 1;
var totalScore = 0;
var playerLives;
var levelScore;
var playAgain;

var SPECULAR = 0.5;

var keyPos = [0.0, 0.0, -16.0];
var lightRot = 0;
var lightRotSpeed = 0.05;

var rotCameraX = [0.0, 0.0, 0.0, 0.0];
var rotCameraY = [0.0, 0.0, 0.0, 0.0];
var rotCameraZ = 0.0;

var KEYDOWN = false;
var ALT = false;

var eye = [0.0, 0.0, 16.0];
var lookAt = [0.0, 1.0, 0.0];
var up = [0.0, 1.0, 0.0];
var cameraMatrix = [eye, lookAt, up];
var zoomLevel = 100;
var zoom = [0.80, 0.15, 0.9, 0.5];
var selectedCam = 0;
var camera1 = [0.0, 0.0, -16.0];
var camera2 = [1.0, 10.0, -3.0];
var camera3 = [20.0, 0.0, -64.0];
var camera4 = [-0.0, 4.0, 16.0];
var cameras = [camera1, camera2, camera3, camera4];

var galvanizedTexture;

//                  Misc helpful URLs
//  Sproingie Wiki: https://bitbucket.org/emackey/sproingies/wiki/
//          JSLint: http://www.jslint.com/
//      WebGL Spec: http://www.khronos.org/registry/webgl/specs/latest/
//       GLSL Spec: http://www.opengl.org/sdk/docs/manglsl/
//    glMatrix lib: http://code.google.com/p/glmatrix/
// WebGL Inspector: http://benvanik.github.com/WebGL-Inspector/
//
// Initialize WebGL
//

function initGL(canvas) {
	try {
		gl = WebGLUtils.setupWebGL(canvas);
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (ex) {}

	if (gl) {
		document.getElementById("loadingWebGL").style.display = "none";
		document.getElementById("glCanvas").style.display = "block";
		resizeGL();
	} else {
		document.getElementById("loadingWebGL").style.display = "none";
		document.getElementById("missingWebGL").style.display = "block";
		$("#play,#showInspector,#showSettings").button("option", "disabled", true);
	}
}

function resizeGL() {
	var canvas = document.getElementById(glCanvasName);
	gl.viewportWidth = canvas.width = canvas.clientWidth;
	gl.viewportHeight = canvas.height = canvas.clientHeight;
	//document.getElementById("info").innerHTML = "Size " + gl.viewportWidth + " x " + gl.viewportHeight;
}

//
// Fetch a shader from another script block, and compile it.
//

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType === 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type === "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type === "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(id + " compile error:\n\n" + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

//
// Init a shader program.
//

function initShaders(shaderProgram, fsName, vsName) {
	var fragmentShader = getShader(gl, fsName);
	var vertexShader = getShader(gl, vsName);

	if ((fragmentShader !== null) && (vertexShader !== null)) {
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	//  attribute vec2 aUVCoords;
	shaderProgram.aUVCoords = gl.getAttribLocation(shaderProgram, "aUVCoords");
	if (shaderProgram.aUVCoords) {
		gl.enableVertexAttribArray(shaderProgram.aUVCoords);
	}

	// Vertex shader uniforms
	//  uniform mat4 uMVMatrix;
	//  uniform mat4 uProjMatrix;
	//  uniform mat4 uNormalMatrix;
	//  uniform vec3 uGroundPos;
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.normalMatrixUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
	shaderProgram.groundPosUniform = gl.getUniformLocation(shaderProgram, "uGroundPos");

	// Fragment shader uniforms
	//  uniform vec4 uKeyLightColor;
	//  uniform vec3 uKeyLightPos;  // Light positions should be premultiplied with thier own view matrix.
	//  uniform vec4 uFillLightColor;
	//  uniform vec3 uFillLightPos;
	//  uniform vec4 uMaterialColor;
	//  uniform vec4 uMaterialSpecular;
	//  uniform vec4 uMaterialAltColor;
	shaderProgram.uKeyLightColor = gl.getUniformLocation(shaderProgram, "uKeyLightColor");
	shaderProgram.uKeyLightPos = gl.getUniformLocation(shaderProgram, "uKeyLightPos");
	shaderProgram.uFillLightColor = gl.getUniformLocation(shaderProgram, "uFillLightColor");
	shaderProgram.uFillLightPos = gl.getUniformLocation(shaderProgram, "uFillLightPos");
	shaderProgram.uMaterialColor = gl.getUniformLocation(shaderProgram, "uMaterialColor");
	shaderProgram.uMaterialSpecular = gl.getUniformLocation(shaderProgram, "uMaterialSpecular");
	shaderProgram.uMaterialAltColor = gl.getUniformLocation(shaderProgram, "uMaterialAltColor");
}

function initmacbookShaders(shaderProgram, fsName, vsName) {
	var fragmentShader = getShader(gl, fsName);
	var vertexShader = getShader(gl, vsName);

	if ((fragmentShader !== null) && (vertexShader !== null)) {
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise macbook shaders");
		}
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.materialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
	shaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(shaderProgram, "uShowSpecularHighlights");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
	shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
	shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
	shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");
	shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
}

function handlemacbookLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

function initmacbookTextures() {

	galvanizedTexture = gl.createTexture();
	galvanizedTexture.image = new Image();
	galvanizedTexture.image.onload = function () {
		handlemacbookLoadedTexture(galvanizedTexture)
	}
	galvanizedTexture.image.src = "images/arroway.de_metal+structure+06_d100_flat.jpg";
}

function initTeapotShaders(shaderProgram, fsName, vsName) {
	var fragmentShader = getShader(gl, fsName);
	var vertexShader = getShader(gl, vsName);

	if ((fragmentShader !== null) && (vertexShader !== null)) {
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise teapot shaders");
		}
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.materialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
	shaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(shaderProgram, "uShowSpecularHighlights");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
	shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
	shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
	shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");
	shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
}

function handleTeapotLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}


function initTeapotTextures() {

	galvanizedTexture = gl.createTexture();
	galvanizedTexture.image = new Image();
	galvanizedTexture.image.onload = function () {
		handleTeapotLoadedTexture(galvanizedTexture)
	}
	galvanizedTexture.image.src = "images/arroway.de_metal+structure+06_d100_flat.jpg";
}

function initBoomShaders(shaderProgram, fsName, vsName) {
	var fragmentShader = getShader(gl, fsName);
	var vertexShader = getShader(gl, vsName);

	if ((fragmentShader !== null) && (vertexShader !== null)) {
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise boom shaders");
		}
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	// Vertex shader uniforms
	//  uniform mat4 uMVMatrix;
	//  uniform mat4 uProjMatrix;
	//  uniform float uPointSize;
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.uPointSize = gl.getUniformLocation(shaderProgram, "uPointSize");
	shaderProgram.groundPosUniform = null;

	// Fragment shader uniforms
	//  uniform vec4 uColor;
	//  uniform sampler2D uDotSampler;
	shaderProgram.uColor = gl.getUniformLocation(shaderProgram, "uColor");
	shaderProgram.uDotSampler = gl.getUniformLocation(shaderProgram, "uDotSampler");
}

function initExplodeShaders(shaderProgram, fsName, vsName) {
	var fragmentShader = getShader(gl, fsName);
	var vertexShader = getShader(gl, vsName);

	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise explosion shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.pointLifetimeAttribute = gl.getAttribLocation(shaderProgram, "aLifetime");
	gl.enableVertexAttribArray(shaderProgram.pointLifetimeAttribute);

	shaderProgram.pointStartPositionAttribute = gl.getAttribLocation(shaderProgram, "aStartPosition");
	gl.enableVertexAttribArray(shaderProgram.pointStartPositionAttribute);

	shaderProgram.pointEndPositionAttribute = gl.getAttribLocation(shaderProgram, "aEndPosition");
	gl.enableVertexAttribArray(shaderProgram.pointEndPositionAttribute);

	shaderProgram.pointOffsetAttribute = gl.getAttribLocation(shaderProgram, "aOffset");
	gl.enableVertexAttribArray(shaderProgram.pointOffsetAttribute);

	shaderProgram.pointTextureCoordsAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoords");
	gl.enableVertexAttribArray(shaderProgram.pointTextureCoordsAttribute);

	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "sTexture");
	shaderProgram.centerPositionUniform = gl.getUniformLocation(shaderProgram, "uCenterPosition");
	shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
	shaderProgram.timeUniform = gl.getUniformLocation(shaderProgram, "uTime");

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	//shaderProgram.uPointSize = gl.getUniformLocation(shaderProgram, "uPointSize");
}

//
// Textures
//

function handleLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTextures() {
	dotTexture = gl.createTexture();
	dotTexture.image = new Image();
	dotTexture.image.onload = function () {
		handleLoadedTexture(dotTexture);
	};
	dotTexture.image.src = "images/dot.png";
	initTeapotTextures();
}


//
// Set various uniforms
//

function setProjectionUniforms(shaderProgram, pMatrix, groundPos) {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	if (shaderProgram.groundPosUniform !== null) {
		gl.uniform3f(shaderProgram.groundPosUniform, groundPos[0], groundPos[1], groundPos[2]);
	}
}

function setMatrixUniforms(shaderProgram, mvMatrix) {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	// modelview inverse = transpose(inverse(mv))
	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(shaderProgram.normalMatrixUniform, false, normalMatrix);
}

function setLights(shaderProgram, lightMatrix) {

	mat4.multiplyVec3(lightMatrix, keyPos);

	//mat4.rotate(lightMatrix, lightRot, [1, 0, 0]);
	gl.uniform4f(shaderProgram.uKeyLightColor, (254 / 255.0), (239 / 255.0), (203 / 255.0), 1.0);
	gl.uniform3f(shaderProgram.uKeyLightPos, keyPos[0], keyPos[1], keyPos[2]);

	var fillPos = [4.0, 0.0, 24.0];
	mat4.multiplyVec3(lightMatrix, fillPos);
	gl.uniform4f(shaderProgram.uFillLightColor, (0.4 * 213 / 255.0), (0.4 * 205 / 255.0), (0.4 * 235 / 255.0), 1.0);
	gl.uniform3f(shaderProgram.uFillLightPos, fillPos[0], fillPos[1], fillPos[2]);
}

function setMaterial(shaderProgram, r, g, b, specular, altR, altG, altB) {
	gl.uniform4f(shaderProgram.uMaterialColor, r, g, b, 1.0);
	gl.uniform4f(shaderProgram.uMaterialSpecular, specular, specular, specular, 1.0);
	gl.uniform4f(shaderProgram.uMaterialAltColor, altR, altG, altB, 1.0);
}

function setBoomUniforms(shaderProgram, mvMatrix, r, g, b, pointSize) {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniform4f(shaderProgram.uColor, r, g, b, 1.0);
	gl.uniform1f(shaderProgram.uPointSize, pointSize);
}

function setExplodeUniforms(shaderProgram, mvMatrix, r, g, b, pointSize) {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	gl.uniform4f(shaderProgram.colorUniform, r, g, b, 1.0);
	gl.uniform1f(shaderProgram.uPointSize, pointSize);
	//gl.uniform3f(sproingieExplodeShaderProgram.centerPositionUniform, this.m_X, this.m_Y, this.m_Z);
}

//
// Misc helper functions
//

function myrand(range) {
	return Math.floor(Math.random() * range);
}

function XtoY(x, y) {
	var z = Math.abs(x);
	if (z < 1e-20) {
		return 0.0;
	}

	var a = Math.exp(y * Math.log(z));

	if (x < 0) {
		a = -a;
	}
	return a;
}

function MakeNormal(v1, v2, normals) {
	normals.push((v2[1] * v1[2]) - (v1[1] * v2[2]), (v2[2] * v1[0]) - (v1[2] * v2[0]), (v2[0] * v1[1]) - (v1[0] * v2[1]));
}

function drawmacbook(shaderProgram, sproingieMatrix) {

	mat4.translate(sproingieMatrix, [0, 0.35, 0]);
	mat4.scale(sproingieMatrix, [1, 1, 1]);

	gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, true);

	gl.uniform1i(shaderProgram.useLightingUniform, true);
	gl.uniform3f(shaderProgram.ambientColorUniform, 0.5, 0.5, 0.5);
	gl.uniform3f(shaderProgram.pointLightingLocationUniform, -.1, .04, -.020);
	gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform, 3, 3, 3);
	gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform, 0.8, 0.8, 0.8);
	gl.uniform1i(shaderProgram.useTexturesUniform, true);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, galvanizedTexture);

	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.uniform1f(shaderProgram.materialShininessUniform, 32.0);

	gl.bindBuffer(gl.ARRAY_BUFFER, macbookBuffers.VertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, macbookBuffers.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, macbookBuffers.VertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, macbookBuffers.VertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, macbookBuffers.VertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, macbookBuffers.VertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, macbookBuffers.VertexColorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, macbookBuffers.VertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, macbookBuffers.VertexIndexBuffer);
	setMatrixUniforms(shaderProgram, sproingieMatrix);
	gl.drawElements(gl.TRIANGLES, macbookBuffers.VertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}


function drawTeapot(shaderProgram, sproingieMatrix) {

	mat4.translate(sproingieMatrix, [0, 0.35, 0]);
	mat4.scale(sproingieMatrix, [.03, .04, .04]);

	gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, true);

	gl.uniform1i(shaderProgram.useLightingUniform, true);
	gl.uniform3f(shaderProgram.ambientColorUniform, 0.5, 0.5, 0.5);
	gl.uniform3f(shaderProgram.pointLightingLocationUniform, -.1, .04, -.020);
	gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform, 3, 3, 3);
	gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform, 0.8, 0.8, 0.8);
	gl.uniform1i(shaderProgram.useTexturesUniform, true);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, galvanizedTexture);

	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.uniform1f(shaderProgram.materialShininessUniform, 32.0);

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.VertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, teapotBuffers.VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.VertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, teapotBuffers.VertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.VertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, teapotBuffers.VertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.VertexColorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, teapotBuffers.VertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.VertexIndexBuffer);
	setMatrixUniforms(shaderProgram, sproingieMatrix);
	gl.drawElements(gl.TRIANGLES, teapotBuffers.VertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

//
// Sproingie object declaration
//

function Sproingie(index, max) {
	this.m_X = 0;
	this.m_Y = 0;
	this.m_Z = 0;
	this.m_weirdBits = 0;
	this.m_life = ((-index * ((max > 19) ? 1.0 : 4.0)) - 2.0);
	this.m_stage = 0.0;
	this.m_speed = 0.0;
	this.m_boxiness = 0.02;
	this.m_width = 1.0;
	this.m_R = (40 + myrand(200)) / 255.0;
	this.m_G = (40 + myrand(200)) / 255.0;
	this.m_B = (40 + myrand(200)) / 255.0;
	this.m_index = index;
	this.m_jumping = false;
	this.m_flipJump = false;
	this.m_jumpUp = false;

	if (this.m_index == 0) this.m_type = TYPE_JUMP; //Main Sproingie always is a jumper
	else this.m_type = myrand(NUM_TYPES);
}

Sproingie.prototype.ResetSproingie = function () {
	this.m_life = (-30 + myrand(28));
};

Sproingie.prototype.CheckCollision = function (maxStage) {
	var len = sproingieList.length;
	var t2;

	for (t2 = 0; t2 < len; ++t2) {
		if ((t2 !== this.m_index) && (this.m_X === sproingieList[t2].m_X) && (this.m_Y === sproingieList[t2].m_Y) && (this.m_Z === sproingieList[t2].m_Z) && (sproingieList[t2].m_life > 10.0) && (sproingieList[t2].m_stage < maxStage)) {

			// Collision detection for our hero
			if (sproingieList[t2].m_index == 0) {
				playerDeath();
				return true;
			}

			if (!sproingieList[t2].m_merge && !this.m_merge && ((this.m_type != TYPE_macbook) || (this.m_type != TYPE_TEAPOT))) {
				sproingieList[t2].m_weirdBits = 2;
				sproingieList[t2].m_altR = this.m_R;
				sproingieList[t2].m_altG = this.m_G;
				sproingieList[t2].m_altB = this.m_B;
				sproingieList[t2].m_merge = true;
				sproingieList[t2].m_width = 1.75;
				this.m_life = 0;
				return false;
			}


			return true;
		}
	}
	return false;
};

Sproingie.prototype.AdvanceSproingie = function (nextStage) {
	var g_higher, g_back;
	var index = this.m_index;
	var useDifferentSpeeds = ((weirdness > 1) && (index > 1));

	if (this.m_life > 0.0) {
		if (this.m_stage < BOOM_STAGE) {
			nextStage *= this.m_speed;
		}

		var locX = -this.m_X - this.m_Y / 2;

		//Right Side			Left Side
		if (((locX < -worldWidth) || (locX > worldWidth) || (Math.abs(this.m_Y / 2) >= worldHeight)) && this.m_life > 10.0) {
			this.m_life = 10;
			this.m_stage = BOOM_STAGE;
			if ((this.m_R += 0.5) > 1.0) {
				this.m_R = 1.0;
			}
			if ((this.m_G += 0.5) > 1.0) {
				this.m_G = 1.0;
			}
			if ((this.m_B += 0.5) > 1.0) {
				this.m_B = 1.0;
			}

			if (this.m_index == 0) {
				if (this.m_Y > 0) levelWon();
				else playerDeath();
			}
		}

		if ((this.m_stage += nextStage) >= 12.0) {
			if (this.m_stage >= BOOM_STAGE) {
				if ((this.m_R -= nextStage * 0.08) < 0.0) {
					this.m_R = 0.0;
				}
				if ((this.m_G -= nextStage * 0.08) < 0.0) {
					this.m_G = 0.0;
				}
				if ((this.m_B -= nextStage * 0.08) < 0.0) {
					this.m_B = 0.0;
				}

				if ((this.m_life -= nextStage) <= 0.0000001) {
					this.ResetSproingie();
				}
				return;
			}


			this.m_X += 1;
			this.m_Y -= 2;
			this.m_Z += 1;
			this.m_stage -= 12.0;


			if ((this.m_life > 10.0) && this.CheckCollision(6.0)) {
				this.m_life = 10.0;
				this.m_stage = BOOM_STAGE;
				if ((this.m_R += 0.5) > 1.0) {
					this.m_R = 1.0;
				}
				if ((this.m_G += 0.5) > 1.0) {
					this.m_G = 1.0;
				}
				if ((this.m_B += 0.5) > 1.0) {
					this.m_B = 1.0;
				}
			}


		}


		if (this.m_life < 9.0) {
			if (this.m_stage < 1.0) {
				this.m_stage -= nextStage * 2.0;
				if (this.m_stage < -10.0) {
					this.ResetSproingie();
				}
			}
		} else {
			if (index != 0) //never expire the main Sproingie
			this.m_life -= nextStage;
		}
	} else if ((this.m_life += nextStage) >= 0.0) {
		// A sproingie is born.  Select the birthplace.
		if ((index > 10) && (groundlevel > 1)) { // High-numbered Sproinge, Gadzooks ground...
			g_higher = -worldHeight + myrand(worldHeight * 2); // ...means large birth area.
			g_back = -worldWidth + myrand(worldWidth * 2 + 1);
		} else if ((index > 5) && (groundlevel > 0)) { // Medium-number Sproingie, Lots of ground
			g_higher = -worldHeight + myrand(worldHeight * 2); // medium-sized birth area.
			g_back = -worldWidth / 2 + myrand(worldWidth + 1);
		} else if (index > 1) { // Small ID numbered Sproingies born to small ground area.
			g_higher = -worldHeight + myrand(worldHeight * 2);
			g_back = -2 + myrand(5);
		} else if (index === 1) { // "Second" Sproingie stays near center.
			g_higher = -2 + myrand(3);
			g_back = -1 + myrand(3);
		} else { // "Main" Sproingie stays in center.
			g_higher = -2;
			g_back = 0;
		}



		this.m_X = (-g_higher - g_back);
		this.m_Y = (g_higher * 2);
		this.m_Z = (g_back - g_higher);
		this.m_life = (40 + myrand(200));
		this.m_stage = -10.0;
		this.m_weirdBits = 0;
		this.m_boxiness = 0.02;
		this.m_width = 1.0;

		if (weirdness > 0) {
			this.m_weirdBits |= SP_BIT_AIRDROP;

			var probability = 52 - (weirdness * 2);

			if (probability < 2) {
				probability = 2;
			}

			if ((probability < 4) || (myrand(Math.floor(probability / 8)) === 0)) {
				if (myrand(probability) === 0) {
					this.m_weirdBits |= SP_BIT_STRIPES;
				}
				if (myrand(probability) === 0) {
					this.m_weirdBits |= SP_BIT_FAT;
				}
				if (myrand(probability) === 0) {
					this.m_boxiness = (Math.random() * 0.2);
				}
				if (myrand(probability) === 0) {
					this.m_width = (Math.random() + 0.4);
				}
			}
		}

		this.m_R = (40 + myrand(200)) / 255.0;
		this.m_G = (40 + myrand(200)) / 255.0;
		this.m_B = (40 + myrand(200)) / 255.0;

		if (this.m_index == 0) {
			this.m_speed = HERO_SPEED_NOT_JUMPING;
			this.m_R = 1;
			this.m_G = 1;
			this.m_B = 1;
		} else {
			if (useDifferentSpeeds) {
				this.m_speed = (this.m_R * 2.0) + (1.0 - (40.0 / 255.0));
			} else {
				this.m_speed = 1.0;
			}
		}

		//New properties to merge sproingies who collide
		this.m_altR = this.m_R;
		this.m_altG = this.m_G;
		this.m_altB = this.m_B;
		this.m_merge = false;

		if (this.CheckCollision(0.0)) {
			// If one is already being born, just wait.
			this.m_life = -1.0;
		}


	}

	if (this.m_index == 0) {
		if (this.m_jumping) {
			if (this.m_stage > 6) {
				this.m_jumping = false;
				this.m_speed = HERO_SPEED_NOT_JUMPING;

				if (this.m_jumpUp) {
					if (this.m_flipJump) this.m_X -= 1;
					else this.m_Z -= 1;

					this.m_Y += 1;
				} else {
					if (this.m_flipJump) this.m_Z += 1;
					else this.m_X += 1;

					this.m_Y -= 1;
				}
			}
		} else {
			if (this.m_stage > 6) this.m_stage = 0;
		}
	}
};

Sproingie.prototype.ParametricSproingie = function (sproingie, sprType, fstage, flipSproingieV, sproingieBuffers, sproingieMatrix) {
	if (fstage < 0.0) {
		fstage = 0.0;
	}
	if (fstage > 6.0) {
		fstage = 6.0;
	}

	var fMoveX;
	var fMoveY;
	var fMoveZ;

	if (this.m_type == TYPE_TEAPOT) {
		fMoveX = (fstage > 2.0) ? ((Math.cos((fstage - 2.0) * Math.PI * 0.25) * -0.5 + 0.5) * fstage / 6.0) : 0.0;
		fMoveY = (fstage > 2.0) ? ((fstage < 4.0) ? (0.25 + 0.25 * Math.cos((fstage - 4.0) * Math.PI * 0.5)) : (0.5 - 0.1325 * ((fstage - 4.0) * (fstage - 4.0)))) : 0.0;
		fRotateZ = (fstage > 1) ? (Math.cos((fstage - 1) * Math.PI / 5.0) * -90.0 + 90.0) : 0.0;
		mat4.translate(sproingieMatrix, [fMoveX + 0.5, fMoveY, -0.5]);
		mat4.rotate(sproingieMatrix, fRotateZ * DegToRad, [0.0, 0.0, -1.0]);
		return;
	}

	if (this.m_type == TYPE_macbook) {
		fMoveX = (fstage > 2.0) ? ((Math.cos((fstage - 2.0) * Math.PI * 0.25) * -0.5 + 0.5) * fstage / 6.0) : 0.0;
		fMoveY = (fstage > 2.0) ? ((fstage < 4.0) ? (0.25 + 0.25 * Math.cos((fstage - 4.0) * Math.PI * 0.5)) : (0.5 - 0.1325 * ((fstage - 4.0) * (fstage - 4.0)))) : 0.0;
		fRotateZ = (fstage > 1) ? (Math.cos((fstage - 1) * Math.PI / 5.0) * -90.0 + 90.0) : 0.0;
		mat4.translate(sproingieMatrix, [fMoveX + 0.5, fMoveY, -0.5]);
		mat4.rotate(sproingieMatrix, fRotateZ * DegToRad, [0.0, 0.0, -1.0]);
		return;
	}

	fMoveX = (fstage > 2.0) ? ((Math.cos((fstage - 2.0) * Math.PI * 0.25) * -0.5 + 0.5) * fstage / 6.0) : 0.0;
	fMoveX += 0.5;

	fMoveY = 0;

	fMoveZ = -0.5;

	if (fstage > 2.0) {
		if (fstage < 4.0) fMoveY = (0.25 + 0.25 * Math.cos((fstage - 4.0) * Math.PI * 0.5));
		else fMoveY = (0.5 - 0.1325 * ((fstage - 4.0) * (fstage - 4.0)));
	}

	var fRotateY = 0;
	var fRotateZ = (fstage > 1) ? (Math.cos((fstage - 1) * Math.PI / 5.0) * -90.0 + 90.0) : 0.0;
	var fBendHeight = (fstage < 4.0) ? (Math.cos(fstage * Math.PI * 0.25) * -0.35 + 0.65) : 1.0;
	var fBendAngle = (Math.cos(fstage * Math.PI / 3.0) * -45.0 + 45.0) * (6.0 - fstage) / 3.0;
	var fBulge = ((fstage < 2.0) ? (Math.sin(fstage * Math.PI * 0.5) * 0.25) : (Math.sin((fstage + 2) * Math.PI * 0.25) * 0.1));
	var fStretch = ((fstage < 2.0) ? (Math.sin(fstage * Math.PI * 0.5) * -0.25 + 1.0) : (Math.sin((fstage + 2.0) * Math.PI * 0.25) * -0.2 + 1.0));


	if (this.m_weirdBits & SP_BIT_AIRDROP) {
		// Old age Sproingie squishes flat against stair.
		if ((this.m_stage < 0.0) && (this.m_life < 10.0)) {
			fBulge = (this.m_stage / -4.0);
		}
	}

	// Fat mode
	if ((this.m_weirdBits & SP_BIT_FAT) && (fBulge < 0.4)) {
		fBulge = 0.4;
	}

	// Skinny
	//fBulge -= 0.2f;
	if (sprType == TYPE_JUMP) {
		fBendAngle = (Math.cos(fstage * Math.PI / 3.0) * -45.0 + 45.0) * (6.0 - fstage) / 3.0;
		fBendAngle *= 0.5;
		fRotateZ = 0;

		var jumpUp = (sproingie.m_index == 0 && sproingie.m_jumping && sproingie.m_jumpUp);

		if (jumpUp) {
			if (fstage < 4) fMoveY = (fstage * 0.3);
			else fMoveY = ((4 * 0.3) - ((fstage - 4) * 0.1));

			fMoveX = -fMoveX;
			fRotateY = 180;
		} else {
			if (fstage > 2.0) {
				if (fstage < 4.0) fMoveY = (0.25 + 0.15 * Math.cos((fstage - 4.0) * Math.PI * 0.5));
				else fMoveY = (0.4 - 0.35 * ((fstage - 4.0) * (fstage - 4.0)));
			} else fMoveY = 0;
		}

		if (this.m_index == 0 && !this.m_jumping) {
			fMoveX = 0.5;
			fBendAngle = 0;
			if (fMoveY < 0) fMoveY = 0;
		}
	} else if (sprType == TYPE_ROLL) {
		fBulge = 0;
		fStretch = 1;
		fBendAngle = 0;
		fRotateZ = 90;

		fMoveX = (fstage > 2.0) ? ((Math.cos((fstage - 2.0) * Math.PI * 0.25) * -0.5 + 0.5) * fstage / 6.0) : 0.0;
		fMoveZ = -0.5;

		if (fstage > 2.0) {
			if (fstage < 4.0) fMoveY = 0.25;
			else fMoveY = (0.25 - 0.25 * ((fstage - 4.0) * (fstage - 4.0)));
		} else fMoveY = 0.25;

		if (flipSproingieV) fRotateY = -90;
		else fRotateY = 90;

		if (fstage >= 5) {
			if (flipSproingieV) fRotateY -= (((fstage - 5) / 1) * 90);
			else fRotateY += (((fstage - 5) / 1) * 90);
		}
	}

	var iU, iV; // ints
	var cosProfile = new Array(S_RES + 1),
		sinProfile = new Array(S_RES + 1);
	var sideProfile = new Array(S_RES + 1),
		radialProfile = new Array(S_RES + 1),
		yProfile = new Array(S_RES + 1);
	var u, v, x, y, z, bulge;

	fBendAngle *= (Math.PI / 180.0);
	var fBendRadius = fBendHeight / fBendAngle;
	var fSinBendAngle = Math.sin(fBendAngle);
	var fCosBendAngle = Math.cos(fBendAngle);

	// Add 0.5 to x and z for original sproingie.
	mat4.translate(sproingieMatrix, [fMoveX, fMoveY, fMoveZ]);
	if (fRotateY != 0) {
		mat4.translate(sproingieMatrix, [0.5, 0, 0]);
		mat4.rotate(sproingieMatrix, fRotateY * DegToRad, [0.0, 1.0, 0.0]);
		mat4.translate(sproingieMatrix, [-0.5, 0, 0]);
	}
	mat4.rotate(sproingieMatrix, fRotateZ * DegToRad, [0.0, 0.0, -1.0]);

	// Build Sproingie shape profiles.
	for (iU = 0; iU <= S_RES; ++iU) {
		v = u = iU / S_RES;

		sinProfile[iU] = Math.sin(M_TWOPI * u);
		cosProfile[iU] = Math.cos(M_TWOPI * u);

		bulge = (XtoY(cosProfile[iU], 3.0) * -0.5 + 0.5) * fBulge; // This is v-based.
		yProfile[iU] = (Math.atan(v * 6.0 - 3.0) * 0.395 + 0.485) * fStretch;
		sideProfile[iU] = Math.pow(Math.sin(Math.PI * v), 0.5) * ((v * v - v + 1.0) * 2.3 - 1.3 + bulge) * 0.5;
		radialProfile[iU] = (Math.cos(Math.PI * ((8.0 * u) + 1.0)) * this.m_boxiness * BOXINESS + 1.0) * this.m_width;
	}

	var vertices = [];
	// Generate the vertex array, with singular top and bottom points.
	for (iV = 0; iV <= S_RES; ++iV) {
		for (iU = 0; iU < S_RES; ++iU) {
			if ((iU === 0) || ((iV > 0) && (iV < S_RES))) {
				x = z = sideProfile[iV] * radialProfile[iU];
				x *= sinProfile[iU];
				y = yProfile[iV];
				z *= cosProfile[iU];

				var oX = x,
					oY = y;

				if (fBendAngle > 0.0000001) {
					if (oY > fBendHeight) {
						x = ((oX - fBendRadius) * fCosBendAngle + ((oY - fBendHeight) * fSinBendAngle) + fBendRadius);

						y = ((fBendRadius - oX) * fSinBendAngle + ((oY - fBendHeight) * fCosBendAngle));
					} else if (oY > 0.0) {
						x = ((oX - fBendRadius) * Math.cos(oY / fBendRadius) + fBendRadius);
						y = ((fBendRadius - oX) * Math.sin(oY / fBendRadius));
					}
				}

				vertices.push(x, y, z);
			}
		}
	}

	// If S_RES === 4, that means 4 per row:
	// single, 4, 4, 4, single
	var normals = [];

	// indexof(p(u, v)) === ((v-1) * S_RES) + u + 1
	// v1 === p(0, 1)           - p((S_RES / 2), 1)        // South - North
	// v2 === p((S_RES / 4), 1) - p(((S_RES * 3) / 4), 1)  // West - East
	var NorthIndex = 3 * (Math.floor(S_RES / 2) + 1);
	var SouthIndex = 3;
	var v1 = [
	vertices[SouthIndex] - vertices[NorthIndex], vertices[SouthIndex + 1] - vertices[NorthIndex + 1], vertices[SouthIndex + 2] - vertices[NorthIndex + 2]];

	var EastIndex = 3 * (Math.floor(S_RES * 0.75) + 1);
	var WestIndex = 3 * (Math.floor(S_RES * 0.25) + 1);
	var v2 = [
	vertices[WestIndex] - vertices[EastIndex], vertices[WestIndex + 1] - vertices[EastIndex + 1], vertices[WestIndex + 2] - vertices[EastIndex + 2]];

	MakeNormal(v1, v2, normals);

	for (iV = 1; iV < S_RES; ++iV) {
		for (iU = 0; iU < S_RES; ++iU) {
			// v1 === p(u, v-2)   - p(u, v)      // South - North
			// v2 === p(u-1, v-1) - p(u+1, v-1)  // West - East
			NorthIndex = 3 * ((iV === (S_RES - 1)) ? ((S_RES - 1) * S_RES + 1) : (iV * S_RES + iU + 1));
			SouthIndex = 3 * ((iV < 2) ? 0 : ((iV - 2) * S_RES + iU + 1));
			v1 = [
			vertices[SouthIndex] - vertices[NorthIndex], vertices[SouthIndex + 1] - vertices[NorthIndex + 1], vertices[SouthIndex + 2] - vertices[NorthIndex + 2]];

			EastIndex = 3 * ((iU === (S_RES - 1)) ? ((iV - 1) * S_RES + 1) : ((iV - 1) * S_RES + iU + 2));
			WestIndex = 3 * ((iU < 1) ? (iV * S_RES) : ((iV - 1) * S_RES + iU));
			v2 = [
			vertices[WestIndex] - vertices[EastIndex], vertices[WestIndex + 1] - vertices[EastIndex + 1], vertices[WestIndex + 2] - vertices[EastIndex + 2]];

			MakeNormal(v1, v2, normals);
		}
	}

	// v1 === p((S_RES / 2), S_RES-1) - p(0, S_RES-1)                  // North - South
	// v2 === p((S_RES / 4), S_RES-1) - p(((S_RES * 3) / 4), S_RES-1)  // West - East
	SouthIndex = 3 * ((S_RES - 2) * S_RES + 1);
	NorthIndex = SouthIndex + 3 * (Math.floor(S_RES / 2) + 1);
	v1 = [
	vertices[NorthIndex] - vertices[SouthIndex], vertices[NorthIndex + 1] - vertices[SouthIndex + 1], vertices[NorthIndex + 2] - vertices[SouthIndex + 2]];

	WestIndex = SouthIndex + 3 * (Math.floor(S_RES * 0.25) + 1);
	EastIndex = SouthIndex + 3 * (Math.floor(S_RES * 0.75) + 1);
	v2 = [
	vertices[WestIndex] - vertices[EastIndex], vertices[WestIndex + 1] - vertices[EastIndex + 1], vertices[WestIndex + 2] - vertices[EastIndex + 2]];

	MakeNormal(v1, v2, normals);

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.VertexPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	sproingieBuffers.itemSize = 3;
	sproingieBuffers.numItems = vertices.length / sproingieBuffers.itemSize;

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.VertexNormal);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
};

Sproingie.prototype.RenderSproingie = function (sproingieBuffers, mvMatrix) {
	var sproingieMatrix = mat4.create(mvMatrix);
	var flipSproingieV = false;
	var fstage = 0;

	if (this.m_stage < 0.0) { // -10.0 to just below 0.0
		if (!(this.m_weirdBits & SP_BIT_AIRDROP)) {
			mat4.translate(sproingieMatrix, [this.m_X, this.m_Y + (this.m_stage / 9.0), this.m_Z]);
		} else {
			if (this.m_life < 10.0) { // Sproingie dies of old age
				var tall = Math.pow((this.m_stage + 10.0) / 10.0, 2.0);
				var wide = ((this.m_stage + 10.0) / 10.0);

				if (this.m_type == TYPE_ROLL) {
					wide = 1;
				}

				mat4.translate(sproingieMatrix, [this.m_X + 0.5, this.m_Y + 0.01, this.m_Z - 0.5]);
				mat4.scale(sproingieMatrix, [wide, tall, wide]);
				mat4.translate(sproingieMatrix, [-0.5, -0.01, 0.5]);

			} else { // Sproingie being born
				var drop = 10.0 - ((this.m_stage + 10.0) * (this.m_stage + 10.0) / 10.0);

				mat4.translate(sproingieMatrix, [this.m_X + 0.5, this.m_Y + drop, this.m_Z - 0.5]);
				mat4.scale(sproingieMatrix, [(this.m_stage + 10.0) / 10.0, (this.m_stage + 10.0) / 10.0, (this.m_stage + 10.0) / 10.0]);
				mat4.translate(sproingieMatrix, [-0.5, 0.0, 0.5]);
			}
		}
		fstage = 0.0;
	} else if (this.m_index == 0) {
		if (this.m_jumping && this.m_jumpUp != this.m_flipJump) {
			mat4.translate(sproingieMatrix, [this.m_X, this.m_Y, this.m_Z - 1]);
			mat4.rotate(sproingieMatrix, -90.0 * DegToRad, [0.0, 1.0, 0.0]);
			flipSproingieV = true;
		} else {
			mat4.translate(sproingieMatrix, [this.m_X, this.m_Y, this.m_Z]);
		}

		fstage = this.m_stage;

		//		if ( this.m_jumping )
		//			fstage = this.m_stage;
		//		else
		//			fstage = 0;
	} else if (this.m_stage >= 6.0) {
		mat4.translate(sproingieMatrix, [this.m_X + 1, this.m_Y - 1, this.m_Z - 1]);
		mat4.rotate(sproingieMatrix, -90.0 * DegToRad, [0.0, 1.0, 0.0]);
		flipSproingieV = true;
		fstage = (this.m_stage - 6.0);
	} else {
		mat4.translate(sproingieMatrix, [this.m_X, this.m_Y, this.m_Z]);
		fstage = this.m_stage;
	}

	this.ParametricSproingie(this, this.m_type, fstage, flipSproingieV, sproingieBuffers, sproingieMatrix);

	if (this.m_type == TYPE_TEAPOT) {

		//mat4.translate(sproingieMatrix, [2, 1, -3]);
		drawTeapot(tpshaderProgram, sproingieMatrix)
		return;
	}
	if (this.m_type == TYPE_macbook) {
		drawmacbook(macbookshaderProgram, sproingieMatrix)
		return;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.VertexPosition);
	gl.vertexAttribPointer(sproingieShaderProgram.vertexPositionAttribute, sproingieBuffers.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.VertexNormal);
	gl.vertexAttribPointer(sproingieShaderProgram.vertexNormalAttribute, sproingieBuffers.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.UVCoords);
	gl.vertexAttribPointer(sproingieShaderProgram.aUVCoords, sproingieBuffers.uvItemSize, gl.FLOAT, false, 0, 0);

	setMatrixUniforms(sproingieShaderProgram, sproingieMatrix);
	if ((this.m_weirdBits & SP_BIT_STRIPES) === 0) {
		setMaterial(sproingieShaderProgram, this.m_R, this.m_G, this.m_B, SPECULAR, this.m_R, this.m_G, this.m_B);
	} else if (this.m_merge) { // Combine the alt color and main color if there was a Sproingie merge
		setMaterial(sproingieShaderProgram, this.m_R, this.m_G, this.m_B, SPECULAR, this.m_altR, this.m_altG, this.m_altB);
	} else if (!flipSproingieV) {
		setMaterial(sproingieShaderProgram, this.m_R, this.m_G, this.m_B, SPECULAR, 1.0 - this.m_R, 1.0 - this.m_G, 1.0 - this.m_B);
	} else {
		setMaterial(sproingieShaderProgram, 1.0 - this.m_R, 1.0 - this.m_G, 1.0 - this.m_B, 0.5, this.m_R, this.m_G, this.m_B);
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sproingieBuffers.VertexIndex);
	gl.drawElements(gl.TRIANGLE_STRIP, sproingieBuffers.numIndices, gl.UNSIGNED_SHORT, 0);
};



Sproingie.prototype.RenderSproingieBoom = function (sproingieBuffers, mvMatrix, dist) {
	var sproingieBoomMatrix = mat4.create(mvMatrix);

	mat4.translate(sproingieBoomMatrix, [this.m_X + 0.5, this.m_Y + 0.5, this.m_Z - 0.5]);
	var scale = ((this.m_stage - BOOM_STAGE) * 2.0);
	mat4.scale(sproingieBoomMatrix, [scale, scale, scale]);

	var pointsize = ((BOOM_STAGE + 8.0) - this.m_stage) - (dist / 64.0);
	if (pointsize < 1.0) {
		pointsize = 1.0;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBoomBuffers.VertexPosition);
	gl.vertexAttribPointer(sproingieBoomShaderProgram.vertexPositionAttribute, sproingieBoomBuffers.itemSize, gl.FLOAT, false, 0, 0);

	setBoomUniforms(sproingieBoomShaderProgram, sproingieBoomMatrix, this.m_R, this.m_G, this.m_B, pointsize);

	gl.drawArrays(gl.POINTS, 0, sproingieBoomBuffers.numItems);
};

Sproingie.prototype.RenderSproingieExplode = function (sproingieBuffers, mvMatrix, dist, render) {
	var sproingieExplodeMatrix = mat4.create(mvMatrix);

	mat4.translate(sproingieExplodeMatrix, [this.m_X + 0.5, this.m_Y + 0.5, this.m_Z - 0.5]);

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieExplodeBuffers.VertexPosition);
	gl.vertexAttribPointer(sproingieExplodeShaderProgram.vertexPositionAttribute, sproingieExplodeBuffers.itemSize, gl.FLOAT, false, 0, 0);

	setExplodeUniforms(sproingieExplodeShaderProgram, sproingieExplodeMatrix, color[0], color[1], color[2], 1.0);

	if (render) gl.drawArrays(gl.TRIANGLES, 0, sproingieExplodeBuffers.numItems);
};

function SproingieTriangleStrip(sproingieBuffers) {
	// Triangle strip
	var indices = [];
	var SouthIndex = (S_RES - 2) * S_RES + 1;
	var NorthIndex = (S_RES - 1) * S_RES + 1;

	for (iU = 0; iU < S_RES; ++iU) {
		indices.push(0, iU + 1);
	}
	indices.push(0, 1);
	for (iV = 2; iV < S_RES; ++iV) {
		for (iU = 0; iU < S_RES; ++iU) {
			indices.push((iV - 2) * S_RES + iU + 1, (iV - 1) * S_RES + iU + 1);
		}
		indices.push((iV - 2) * S_RES + 1, (iV - 1) * S_RES + 1);
	}
	for (iU = 0; iU < S_RES; ++iU) {
		indices.push(iU + SouthIndex, NorthIndex);
	}
	indices.push(SouthIndex);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sproingieBuffers.VertexIndex);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	sproingieBuffers.numIndices = indices.length;

	var UVs = [];
	for (iV = 0; iV <= S_RES; ++iV) {
		for (iU = 0; iU < S_RES; ++iU) {
			UVs.push(iU, iV);
			if ((iV === 0) || (iV === S_RES)) {
				break;
			}
		}
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBuffers.UVCoords);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(UVs), gl.STATIC_DRAW);
	sproingieBuffers.uvItemSize = 2;
	sproingieBuffers.uvNumItems = UVs.length / sproingieBuffers.uvItemSize;
}

function SetMaxSproingies(max) {
	var len = sproingieList.length;

	if (len > max) {
		sproingieList = sproingieList.slice(0, max);
	} else {
		while (len < max) {
			sproingieList.push(new Sproingie(len, max));
			++len;
		}
	}
}

//
// Compute the groundBuffers
//

function computeGround(halfWidth, halfHeight, groundBuffers) {
	var fullWidth = (halfWidth * 2) + 1;
	var fullHeight = (halfHeight * 2);

	var startX = -halfHeight - halfWidth;
	var startY = fullHeight;
	var startZ = halfWidth - halfHeight;

	var vertices = [];
	var normals = [];
	var indices = [];

	var one_normal_group = [
	// Upper top
	0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
	// Lower top
	0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
	// Upper left
	0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
	// Lower left
	0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
	// Upper right
	1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
	// Lower right
	1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];

	var one_index_group = [
	// Upper top
	0, 1, 2, 0, 2, 3,
	// Lower top
	4, 5, 6, 4, 6, 7,
	// Upper left
	8, 9, 10, 8, 10, 11,
	// Lower left
	12, 13, 14, 12, 14, 15,
	// Upper right
	16, 17, 18, 16, 18, 19,
	// Lower right
	20, 21, 22, 20, 22, 23];

	var addTwentyFour = function (element, index, array) {
			array[index] += 24;
			return true;
		};


	var h;
	for (h = 0; h < fullHeight; ++h) {
		var x = startX + h;
		var y = startY - (h * 2);
		var z = startZ + h;



		var w;
		for (w = 0; w < fullWidth; ++w) {
			normals = normals.concat(one_normal_group);
			indices = indices.concat(one_index_group);
			one_index_group.every(addTwentyFour);
			vertices = vertices.concat([
			// Upper top
			x, y, z, x, y, z - 1, x + 1, y, z - 1, x + 1, y, z,
			// Lower top
			x + 1, y - 1, z, x + 1, y - 1, z - 1, x + 2, y - 1, z - 1, x + 2, y - 1, z,
			// Upper left
			x, y, z, x + 1, y, z, x + 1, y - 1, z, x, y - 1, z,
			// Lower left
			x + 1, y - 1, z, x + 2, y - 1, z, x + 2, y - 2, z, x + 1, y - 2, z,
			// Upper right
			x + 1, y, z, x + 1, y, z - 1, x + 1, y - 1, z - 1, x + 1, y - 1, z,
			// Lower right
			x + 2, y - 1, z, x + 2, y - 1, z - 1, x + 2, y - 2, z - 1, x + 2, y - 2, z]);
			++x;
			--z;
		}
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.VertexPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	groundBuffers.itemSize = 3;
	groundBuffers.numItems = vertices.length / groundBuffers.itemSize;

	gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.VertexNormal);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffers.VertexIndex);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	groundBuffers.numIndices = indices.length;
}

function initBuffers() {
	groundBuffers = {};
	groundBuffers.VertexPosition = gl.createBuffer();
	groundBuffers.VertexNormal = gl.createBuffer();
	groundBuffers.VertexIndex = gl.createBuffer();

	computeGround(worldWidth, worldHeight, groundBuffers);

	sproingieBuffers = {};
	sproingieBuffers.VertexPosition = gl.createBuffer();
	sproingieBuffers.VertexNormal = gl.createBuffer();
	sproingieBuffers.VertexIndex = gl.createBuffer();
	sproingieBuffers.UVCoords = gl.createBuffer();
	SproingieTriangleStrip(sproingieBuffers);

	// Macbooks
	macbookBuffers = {};
	macbookBuffers.VertexNormalBuffer = gl.createBuffer();
	macbookBuffers.VertexTextureCoordBuffer = gl.createBuffer();
	macbookBuffers.VertexPositionBuffer = gl.createBuffer();
	macbookBuffers.VertexIndexBuffer = gl.createBuffer();
	macbookBuffers.VertexColorBuffer = gl.createBuffer();
	initmacbookBuffers(macbookBuffers);

	// Teapots
	teapotBuffers = {};
	teapotBuffers.VertexNormalBuffer = gl.createBuffer();
	teapotBuffers.VertexTextureCoordBuffer = gl.createBuffer();
	teapotBuffers.VertexPositionBuffer = gl.createBuffer();
	teapotBuffers.VertexIndexBuffer = gl.createBuffer();
	teapotBuffers.VertexColorBuffer = gl.createBuffer();
	initTeapotBuffers(teapotBuffers);

	// Booms
	sproingieBoomBuffers = {};
	sproingieBoomBuffers.VertexPosition = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieBoomBuffers.VertexPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s1_b_PNTS), gl.STATIC_DRAW);
	sproingieBoomBuffers.itemSize = 3;
	sproingieBoomBuffers.numItems = s1_b_PNTS.length / sproingieBoomBuffers.itemSize;

	// Explosions
	sproingieExplodeBuffers = {};
	sproingieExplodeBuffers.VertexPosition = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, sproingieExplodeBuffers.VertexPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s1_b_PNTS), gl.STATIC_DRAW);
	sproingieExplodeBuffers.itemSize = 3;
	sproingieExplodeBuffers.numItems = s1_b_PNTS.length / sproingieExplodeBuffers.itemSize;

	// Explosions
	var numParticles = 3000;

	lifetimes = [];
	startPositions = [];
	endPositions = [];
	offsets = [];
	textureCoords = [];
	offsetsCycle = [-1, 1, -1, -1, 1, 1, 1, -1, -1, -1, 1, 1, ];
	textureCoordsCycle = [
	0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, ];
	for (var i = 0; i < numParticles; i++) {
		var lifetime = (Math.random() * 0.75) + 0.25;

		var distance = Math.random() * 0.1 - 0.05;
		var theta = Math.random() * 2 * Math.PI;
		var phi = Math.random() * 2 * Math.PI;

		var startX = distance * Math.cos(phi) * Math.sin(theta);
		var startY = distance * Math.cos(theta);
		var startZ = distance * Math.sin(phi) * Math.sin(theta);

		var distance = Math.random() * 3 - 1;
		var theta = Math.random() * 2 * Math.PI;
		var phi = Math.random() * 2 * Math.PI;

		var endX = distance * Math.cos(phi) * Math.sin(theta);
		var endY = distance * Math.cos(theta);
		var endZ = distance * Math.sin(phi) * Math.sin(theta);

		for (var v = 0; v < 6; v++) {
			lifetimes.push(lifetime);

			startPositions.push(startX);
			startPositions.push(startY);
			startPositions.push(startZ);

			endPositions.push(endX);
			endPositions.push(endY);
			endPositions.push(endZ);

			offsets.push(offsetsCycle[v * 2]);
			offsets.push(offsetsCycle[v * 2 + 1]);

			textureCoords.push(textureCoordsCycle[v * 2]);
			textureCoords.push(textureCoordsCycle[v * 2 + 1]);
		}
	}

	pointLifetimesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointLifetimesBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lifetimes), gl.STATIC_DRAW);
	pointLifetimesBuffer.itemSize = 1;
	pointLifetimesBuffer.numItems = numParticles * 6;

	pointStartPositionsBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointStartPositionsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(startPositions), gl.STATIC_DRAW);
	pointStartPositionsBuffer.itemSize = 3;
	pointStartPositionsBuffer.numItems = numParticles * 6;

	pointEndPositionsBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointEndPositionsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(endPositions), gl.STATIC_DRAW);
	pointEndPositionsBuffer.itemSize = 3;
	pointEndPositionsBuffer.numItems = numParticles * 6;

	pointOffsetsBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointOffsetsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);
	pointOffsetsBuffer.itemSize = 2;
	pointOffsetsBuffer.numItems = numParticles * 6;

	pointTextureCoordsBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointTextureCoordsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	pointTextureCoordsBuffer.itemSize = 2;
	pointTextureCoordsBuffer.numItems = numParticles * 6;
}

function initmacbookBuffers(buffers) {
	var macbookData = eval(macbookJSON);
	buffers.VertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(macbookData.vertexNormals), gl.STATIC_DRAW);
	buffers.VertexNormalBuffer.itemSize = 3;
	buffers.VertexNormalBuffer.numItems = macbookData.vertexNormals.length / 3;

	buffers.VertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(macbookData.vertexTextureCoords), gl.STATIC_DRAW);
	buffers.VertexTextureCoordBuffer.itemSize = 2;
	buffers.VertexTextureCoordBuffer.numItems = macbookData.vertexTextureCoords.length / 2;

	buffers.VertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(macbookData.vertexPositions), gl.STATIC_DRAW);
	buffers.VertexPositionBuffer.itemSize = 3;
	buffers.VertexPositionBuffer.numItems = macbookData.vertexPositions.length / 3;

	buffers.VertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.VertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(macbookData.indices), gl.STATIC_DRAW);
	buffers.VertexIndexBuffer.itemSize = 1;
	buffers.VertexIndexBuffer.numItems = macbookData.indices.length;

	buffers.VertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
	buffers.VertexColorBuffer.itemSize = 4;
	buffers.VertexColorBuffer.numItems = 1;
}

function initTeapotBuffers(buffers) {
	var teapotData = eval(teapotJSON);
	buffers.VertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexNormals), gl.STATIC_DRAW);
	buffers.VertexNormalBuffer.itemSize = 3;
	buffers.VertexNormalBuffer.numItems = teapotData.vertexNormals.length / 3;

	buffers.VertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexTextureCoords), gl.STATIC_DRAW);
	buffers.VertexTextureCoordBuffer.itemSize = 2;
	buffers.VertexTextureCoordBuffer.numItems = teapotData.vertexTextureCoords.length / 2;

	buffers.VertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexPositions), gl.STATIC_DRAW);
	buffers.VertexPositionBuffer.itemSize = 3;
	buffers.VertexPositionBuffer.numItems = teapotData.vertexPositions.length / 3;

	buffers.VertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.VertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotData.indices), gl.STATIC_DRAW);
	buffers.VertexIndexBuffer.itemSize = 1;
	buffers.VertexIndexBuffer.numItems = teapotData.indices.length;

	buffers.VertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.VertexColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
	buffers.VertexColorBuffer.itemSize = 4;
	buffers.VertexColorBuffer.numItems = 1;
}

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	$("#levelNum").html(gameLevel);
	$("#scoreNum").html(totalScore);
	$('#levelScoreNum').html(levelScore);
	$('#livesNum').html(playerLives);

	var pMatrix = mat4.create();
	var fov = 88.0;

	if ((gl.viewportWidth > gl.viewportHeight) && (gl.viewportHeight > 0)) {
		fov *= (gl.viewportHeight / gl.viewportWidth);
	}
	mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, 0.1, 2000.0, pMatrix);

	var mvMatrix = mat4.create();
	mat4.identity(mvMatrix);
	eye = cameras[selectedCam];
	eye[2] = 100 * (1 - zoom[selectedCam]) + 2;
	mvMatrix = mat4.lookAt(eye, lookAt, up);

	mat4.rotate(mvMatrix, rotCameraX[selectedCam] * DegToRad, [1.0, 0.0, 0.0]);
	mat4.rotate(mvMatrix, rotCameraY[selectedCam] * DegToRad, [0.0, 1.0, 0.0]);

	var worldMatrix = mat4.create(mvMatrix);

	var groundPos = [ground * (-1.0 / 12.0) - 0.75, ground * (2.0 / 12.0) - 0.5, // Multiply the ground Y by the height to achieve smooth scaling -MB
	ground * (-1.0 / 12.0) + 0.75];

	mat4.translate(mvMatrix, groundPos);

	//
	// Render the ground
	//
	gl.useProgram(groundShaderProgram);

	gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.VertexPosition);
	gl.vertexAttribPointer(groundShaderProgram.vertexPositionAttribute, groundBuffers.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffers.VertexNormal);
	gl.vertexAttribPointer(groundShaderProgram.vertexNormalAttribute, groundBuffers.itemSize, gl.FLOAT, false, 0, 0);

	setLights(groundShaderProgram, worldMatrix);
	setProjectionUniforms(groundShaderProgram, pMatrix, groundPos);
	setMatrixUniforms(groundShaderProgram, mvMatrix);
	setMaterial(groundShaderProgram, groundRGB[0], groundRGB[1], groundRGB[2], 0.5, // Side RGB, Side specularity
	0.392157, 0.784314, 0.941176); // Top RGB
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffers.VertexIndex);
	gl.drawElements(gl.TRIANGLES, groundBuffers.numIndices, gl.UNSIGNED_SHORT, 0);

	//
	// Render the Sproingies!
	//
	var numSproingies = sproingieList.length;
	var t;
	if (!KILL_ALL) {
		for (t = 0; t < numSproingies; ++t) {
			if ((sproingieList[t].m_life > 0.0) && (sproingieList[t].m_stage < (BOOM_STAGE - 0.001))) {
				if (sproingieList[t].m_type == TYPE_macbook) {
					gl.useProgram(macbookshaderProgram);
					setLights(macbookshaderProgram, worldMatrix);
					setProjectionUniforms(macbookshaderProgram, pMatrix, groundPos);
				} else if (sproingieList[t].m_type == TYPE_TEAPOT) {
					gl.useProgram(tpshaderProgram);
					setLights(tpshaderProgram, worldMatrix);
					setProjectionUniforms(tpshaderProgram, pMatrix, groundPos);
				} else {
					gl.useProgram(sproingieShaderProgram);
					setLights(sproingieShaderProgram, worldMatrix);
					setProjectionUniforms(sproingieShaderProgram, pMatrix, groundPos);
				}
				sproingieList[t].RenderSproingie(sproingieBuffers, mvMatrix);
			}
		}
	}

	//
	// Render the booms (original)
	//
	if (!KILL_ALL) {
		gl.useProgram(sproingieBoomShaderProgram);
		setProjectionUniforms(sproingieBoomShaderProgram, pMatrix, groundPos);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, dotTexture);
		gl.uniform1i(sproingieBoomShaderProgram.uDotSampler, 0);

		gl.enable(gl.BLEND);
		for (t = 0; t < numSproingies; ++t) {
			if ((sproingieList[t].m_life > 0.000001) && (sproingieList[t].m_stage >= (BOOM_STAGE - 0.001))) {
				sproingieList[t].RenderSproingieBoom(sproingieBuffers, mvMatrix, dist);
			}
		}
		gl.disable(gl.BLEND);
	}

	//
	// Render the explosions
	// If level is won explode all the bad guys with this new explosion
	//
	gl.useProgram(sproingieExplodeShaderProgram);
	setProjectionUniforms(sproingieExplodeShaderProgram, pMatrix, groundPos);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, explodeTexture);
	gl.uniform1i(sproingieExplodeShaderProgram.samplerUniform, 0);

	if (KILL_ALL) {
		// Hero has index zero
		for (t = 1; t < numSproingies; ++t) {
			sproingieList[t].RenderSproingieExplode(sproingieBuffers, mvMatrix, dist, KILL_ALL);
			// Send the sproingies back to 'start'
			sproingieList[t].ResetSproingie();
		}
		animateHero(sproingieList[0], mvMatrix);
		KILL_ALL = false;
	} else {
		sproingieList[0].RenderSproingieExplode(sproingieBuffers, mvMatrix, dist, KILL_ALL);
	}
	gl.disable(gl.BLEND);
}

var heroAnimStage = 0;

function animateHero(hero, sproingieMatrix) {
	heroAnimStage++;

	var rotAngle = Math.cos(heroAnimStage * Math.PI / 90) * 360.0
	var fRotateZ = rotAngle + 360.0;


	if (heroAnimStage < 45) {
		mat4.rotate(sproingieMatrix, fRotateZ * DegToRad, [0.1, 0.1, .2]);
	} else if (heroAnimStage < 90) {
		mat4.translate(sproingieMatrix, [0.5, 0, -0.5]);
		mat4.rotate(sproingieMatrix, heroAnimStage * 10 * DegToRad, [0, 1, 0]);
		mat4.translate(sproingieMatrix, [-0.5, 0, 0.5]);
		mat4.rotate(sproingieMatrix, rotAngle * 2 * DegToRad, [0, 0, 1]);
	}
}

function handleExplodeTexture(explodeTexture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, explodeTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, explodeTexture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

var explodeTexture;

function initExplodeTexture() {
	explodeTexture = gl.createTexture();
	explodeTexture.image = new Image();
	explodeTexture.image.onload = function () {
		handleExplodeTexture(explodeTexture)
	}

	explodeTexture.image.src = "images/smoke.gif";
}

function nextSproingie(timePassed) {
	var nextStage = timePassed * howfast * 0.333333333 + gameLevel / 50;
	var numSproingies = sproingieList.length;
	var t;

	// if ((ground += nextStage) >= 12.0) {
	//    ground -= 12.0;
	//  for (t = 0; t < numSproingies; ++t) {
	//      sproingieList[t].m_X -= 1;
	//      sproingieList[t].m_Y += 2;
	//      sproingieList[t].m_Z -= 1;
	//  }
	// }
	for (t = 0; t < numSproingies; ++t) {
		sproingieList[t].AdvanceSproingie(nextStage);
	}

	if (target_wait < 0.0) { /* track to current target */
		var howFar = Math.pow(CAMERA_SLIDE_RATE, (timePassed * 1000.0));
		if (howFar > 0.9999) {
			howFar = 0.9999;
		}

		//rotx = target_rx + (howFar * (rotx - target_rx));
		//roty = target_ry + (howFar * (roty - target_ry));
		dist = target_dist + (howFar * (dist - target_dist));

		if ((Math.abs(target_rx - rotx) < 0.01) && (Math.abs(target_ry - roty) < 0.01) && (Math.abs(target_dist - dist) < 0.01)) {
			target_wait = max_target_wait;
			if (target_dist <= 32) {
				target_wait *= 0.25;
			}
		}
	} else if ((target_wait -= (timePassed * 10.0)) < 0.0) { /* make up new target */
		var old_dist = target_dist;

		target_wait = -1.0;
		target_rx = myrand(100) - 35;
		target_ry = -myrand(90);
		target_dist = 32 << myrand(2); /* could be 32, 64, or 128, (previously or 256) */

		if (target_dist >= old_dist) { /* no duplicate distances */
			target_dist *= 2.0;
		}
	} /* Otherwise just hang loose for a while here */
}

function setLevel(time) {
	if (timePassed > time) gameLevel++;
}

function newGame() {
	playerLives = 3;
	totalScore = 0;
	gameLevel = 1;
	levelScore = 10000 * gameLevel / 2;
	setScore();

}

function setScore() {
	if (levelScore <= 0) {
		clearTimeout(LevelTimer);
		return;
	}

	if (!isPaused) levelScore -= 10;
	LevelTimer = setTimeout("setScore()", 100);
}

function levelWon() {
	sproingieList[0].ResetSproingie();
	alert('Level ' + gameLevel + ' Won!');
	gameLevel++;
	totalScore = levelScore + totalScore;
	levelScore = 10000 * gameLevel / 2;
	SetMaxSproingies(DEFAULT_NUM_SPROINGIES + gameLevel * 2);

	if (gameLevel % 3 == 0) {
		//worldWidth--;
		computeGround(--worldWidth, worldHeight, groundBuffers);
	}
	//Kill all other sproingies.
	KILL_ALL = true
	groundRGB = [Math.random(), Math.random(), Math.random()];



}

function playerDeath() {
	playerLives--;
	var mvMatrix = mat4.create();
	mat4.identity(mvMatrix);
	sproingieList[0].RenderSproingieBoom(sproingieBuffers, mvMatrix, dist);
	if (playerLives <= 0) gameOver();
}

function gameOver() {
	var playAgain = confirm("Game Over - Play Again?");
	clearTimeout(LevelTimer);
	if (playAgain == true) sproingieList[0].ResetSproingie();
	newGame();
}

var explodeTime = 1.0;

function animate() {
	var timeNow = new Date().getTime();
	if (lastTime !== 0) {
		keyPos = [0.0, 0.0, -4.0];
		lightRot += lightRotSpeed;

		var timePassed = (timeNow - lastTime) * 0.001;
		fpsTime += timePassed;
		fpsFrames++;
		explodeTime += timePassed / 10000;

		if (fpsFrames <= 0) {
			fpsTime = timePassed = 0;
		} else if (fpsTime > 2) {
			var fps = fpsFrames / fpsTime;
			$(".showFPS").html(fps.toFixed(2) + " fps");
			fpsFrames = fpsTime = 0;
		}

		// Explosions
		if (explodeTime >= 1.0) {
			explodeTime = 0;
			color = [Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, 0.5];
		}

		if (timePassed > 1.0e-5) {

			if (looking < -0.00001) {
				lookAway += looking * timePassed;

				if (lookAway < 0.0) {
					lookAway = 0.0;
					looking = 0.0;
				}
			}

			if (!isPaused) {
				nextSproingie(timePassed);
			}
		}

		if (toolbarVisible) {
			toolbarLife -= timePassed;
			if (toolbarLife < 0) {
				toolbarVisible = false;
				$("#toolbar").hide("fade", {}, TOOLBAR_FADE_SPEED);
				//$("body").css('cursor', 'none');
			}
		}

	}

	lastTime = timeNow;
}


function tick() {
	requestAnimFrame(tick);
	drawScene();
	animate();
}

function handleMouseDown(event) {
	mouseDown = event.button;
	lastMouseX = event.clientX;
	lastMouseY = event.clientY;
}

function handleMouseUp(event) {
	mouseDown = -1;
}

function handleMouseMove(event) {
	//document.getElementById("info").innerHTML = "Button " + event.button;
	if (mouseDown < 0) {
		toolbarLife = MAX_TOOLBAR_LIFE;
		if (!toolbarVisible) {
			toolbarVisible = true;
			$("#toolbar").show("fade", {}, TOOLBAR_FADE_SPEED);
			//$("body").css('cursor', 'auto');
		}
		return;
	}

	var dx = event.clientX - lastMouseX;
	var dy = event.clientY - lastMouseY;

	lastMouseX = event.clientX;
	lastMouseY = event.clientY;

	if (mouseDown === 0) {
		target_wait = max_target_wait * 2.0;
		rotCameraX[selectedCam] += dy * 0.5;
		rotCameraY[selectedCam] += dx * 0.5;

		if (rotCameraX[selectedCam] < -35.0) {
			rotCameraX[selectedCam] = -35.0;
		}
		if (rotCameraX[selectedCam] > 65.0) {
			rotCameraX[selectedCam] = 65.0;
		}

		if (rotCameraY[selectedCam] < -90.0) {
			rotCameraY[selectedCam] = -90.0;
		}
		if (rotCameraY[selectedCam] > 0.0) {
			rotCameraY[selectedCam] = 0.0;
		}
	} else {
		target_wait = max_target_wait * 2.0;
		dist += (dist * -0.01 * dy);

		if ((zoom[selectedCam] <= 1 || dy > 0) && (zoom[selectedCam] >= 0 || dy < 0)) {
			///var z = zoom + (zoom * 0.01 * dy); 
			var z = zoom[selectedCam] + (0.005 * dy);
			if (z <= 1 && z >= 0) zoom[selectedCam] = z;
			$("#zoomLevel").html(zoom[selectedCam].toFixed(2) * 100);
			$("#zoomLevelSlider").slider({
				value: zoom[selectedCam]
			});
		}

/* var r = rotCameraY + dx;
		  if(r < 90 && r > -90)
		  rotCameraY = r; */

		if (dist < 32.0) {
			dist = 32.0;
		}
		if (dist > 256.0) {
			dist = 256.0;
		}
	}
}

function handleDblClick(event) {
	zoomIn();
}

function zoomIn() {
	if (zoom[selectedCam] < 0.99) {
		zoom[selectedCam] += (1 - zoom[selectedCam]) * .2;
		$("#zoomLevel").html(zoom[selectedCam].toFixed(2) * 100);
		$("#zoomLevelSlider").slider({
			value: zoom[selectedCam]
		});
	}
}

function handleKeys(event) {

	switch (event.keyCode) {
	case 49:
		//1
		selectedCam = 0;
		break;
	case 50:
		//2
		selectedCam = 1;
		break;
	case 51:
		//3
		selectedCam = 2;
		break;
	case 52:
		//4
		selectedCam = 3;
		break;

	default:
		break;
		break;
	}
	//alert('selected camera =' + selectedCam);
	ALT = false;
}


function webGLStart() {
	var canvas = document.getElementById(glCanvasName);
	initGL(canvas);
	initExplodeTexture();
	if (!gl) {
		return;
	}
	window.onresize = resizeGL;

	groundShaderProgram = gl.createProgram();
	initShaders(groundShaderProgram, "shader-fs-ground", "shader-vs-ground");
	sproingieShaderProgram = gl.createProgram();
	initShaders(sproingieShaderProgram, "shader-fs-sproingie", "shader-vs-sproingie");
	sproingieBoomShaderProgram = gl.createProgram();
	initBoomShaders(sproingieBoomShaderProgram, "shader-fs-boom", "shader-vs-boom");

	sproingieExplodeShaderProgram = gl.createProgram();
	initExplodeShaders(sproingieExplodeShaderProgram, "shader-fs-explode", "shader-vs-explode");
	tpshaderProgram = gl.createProgram();
	initTeapotShaders(tpshaderProgram, "teapot-shader-fs", "teapot-shader-vs");

	tpshaderProgram = gl.createProgram();
	initTeapotShaders(tpshaderProgram, "teapot-shader-fs", "teapot-shader-vs");

	macbookshaderProgram = gl.createProgram();
	initmacbookShaders(macbookshaderProgram, "macbook-shader-fs", "macbook-shader-vs");

	initBuffers();
	initTextures();

	SetMaxSproingies(DEFAULT_NUM_SPROINGIES);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	// The original Sproingies used clockwise surfaces,
	// for reasons lost to the sands of time...
	// (Probably because they were modeled in Lightwave 3D back in the 90's...)
	gl.frontFace(gl.CW);
	gl.enable(gl.CULL_FACE);

	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	document.ondblclick = handleDblClick;
	document.onkeypress = handleKeys;
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;

	tick();
}


function handleKeyUp(evt) {

	KEYDOWN = false;
}

function handleKeyDown(evt) {


	ALT = evt.altKey;

	if (KEYDOWN) return;


	switch (evt.keyCode) {
	default:
		return;

	case 27:
		// escape
		sproingieList[0].m_life = 10;
		sproingieList[0].m_stage = BOOM_STAGE;
		return;

		//up left
	case 37:
		// left arrow
	case 69:
		// e                
	case 100:
		// numpad left
	case 103:
		// numpad 7
		sproingieJump(sproingieList[0], true, true);
		break;

		//up right
	case 38:
		// up arrow
	case 82:
		// r
	case 104:
		// numpad up
	case 105:
		// numpad 9
		sproingieJump(sproingieList[0], true, false);
		break;

		// down right
	case 39:
		// right arrow
	case 70:
		// f
	case 102:
		// numpad right
	case 99:
		// numpad 3
		sproingieJump(sproingieList[0], false, false);
		break;

		//down left
	case 40:
		// down arrow
	case 68:
		// d
	case 98:
		// numpad down
	case 97:
		// numpad 1
		sproingieJump(sproingieList[0], false, true);
		break;
	}
	KEYDOWN = true;
}

function sproingieJump(sproingie, jumpUp, flipJump) {
	if (sproingie.m_jumping) return false;

	sproingie.m_jumping = true;
	sproingie.m_jumpUp = jumpUp;
	sproingie.m_flipJump = flipJump;
	sproingie.m_stage = 0;
	sproingie.m_speed = HERO_SPEED_JUMPING;

	return true;
}

function insertInspector() {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "js/webgl-inspector/embed.js";
	document.head.appendChild(script);
}

function startup() {
	//start a new game.
	newGame();
	if (document.URL.indexOf("inspect=1") > 1) {
		window.afterInspectorLoad = webGLStart;
		insertInspector();
	} else {
		webGLStart();
	}
}

// Slider sets code

function ReadMaxSproingies(val) {
	val = 101 - val;
	var x = 2.0 - (val / 50.0);
	var y = Math.floor((Math.exp(x * 1.2) * 10.0 - 7.0) + 0.5);

	SetMaxSproingies(y);
	$("#howManyNum").html(y);
	return y;
}

// Code sets slider

function PutMaxSproingies(num) {
	//var num = sproingieList.length;
	$("#howManyNum").html(num);
	var x = Math.log((num + 7.0) / 10.0) / 1.2;
	var y = Math.floor(((2.0 - x) * 50.0) + 0.5);
	y = 101 - y;

	if (y < 1) {
		y = 1;
	}
	if (y > 100) {
		y = 100;
	}

	return y;
}

// Slider sets code

function ReadHowFast(val) {
	val = 101 - val;
	var x = 2.0 - (val / 50.0);
	var y = Math.floor((Math.exp(x * 1.2) * 10.0 - 7.0) + 0.5);

	howfast = y;
	$("#howFastNum").html(y);
	return y;

}
// Code sets slider

function PutHowFast() {
	$("#howFastNum").html(howfast);
	var x = Math.log((howfast + 7.0) / 10.0) / 1.2;
	var y = Math.floor(((2.0 - x) * 50.0) + 0.5);
	y = 101 - y;

	if (y < 1) {
		y = 1;
	}
	if (y > 100) {
		y = 100;
	}

	return y;
}

$(function () {

	// Add the ".checked()" function to jQuery
	$.fn.checked = function (value) {
		// From http://stackoverflow.com/questions/426258/how-do-i-check-a-checkbox-with-jquery-or-javascript
		//  and http://jsfiddle.net/xixionia/WnbNC/
		if (value === true || value === false) {
			// Set the value of the checkbox
			$(this).each(function () {
				this.checked = value;
			});
		} else if (value === undefined || value === 'toggle') {
			// Toggle the checkbox
			$(this).each(function () {
				this.checked = !this.checked;
			});
		}
		return $(this);
	};

	$("#infoDialog").dialog({
		autoOpen: false,
		show: "fade",
		hide: "fade",
		width: 730,
		zIndex: 2000,
		buttons: {
			"Ok": function () {
				$(this).dialog("close");
			}
		}
	});

	$("#play").button({
		text: true,
		icons: {
			primary: "ui-icon-pause"
		}
	}).click(function () {
		var options;
		if ($(this).text() === "play") {
			isPaused = false;
			options = {
				label: "pause",
				icons: {
					primary: "ui-icon-pause"
				}
			};
		} else {
			isPaused = true;
			options = {
				label: "play",
				icons: {
					primary: "ui-icon-play"
				}
			};
		}
		$(this).button("option", options);
	});
	$("#showInfo").button({
		text: true,
		icons: {
			primary: "ui-icon-info"
		}
	}).click(function () {
		if ($("#infoDialog").is(":visible")) {
			$("#infoDialog").dialog("close");
		} else {
			$("#infoDialog").dialog("open");
		}
	});

	// Move the version text to the bottom of the dialog.
	$(".ui-dialog:has(#infoDialog) .ui-dialog-buttonpane").prepend('<div class="version2">' + $("div.version").html() + "<\/div>");
	$(".version").remove();

	// Make an FPS display
	$(".ui-dialog:has(#settingsDialog) .ui-dialog-buttonpane").prepend('<div class="showFPS"><\/div>');
});
var background = new Audio("Audio/onBackground.mid");
var winlevel = new Audio("Audio/onWinlevel.mp3");
var rewardcapture = new Audio("Audio/onRewardcapture.mp3");
var gameover = new Audio("Audio/onGameover.mp3");
var jump = new Audio("Audio/onJump.mp3");
var loselife = new Audio("Audio/onLoselife.mp3");
var reward = new Audio("Audio/onReward.mp3");

background.play();
