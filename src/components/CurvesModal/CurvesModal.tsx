import { useEffect, useRef, useState } from 'react';
import { InputNumber, Button, Checkbox } from 'antd';
import getCanvasNCtx from '../../utils/getCanvasNCtx';
import './CurvesModal.css';


// Интерфейс для пропсов компонента CurvesModal
export interface CurvesModalProps { // Ссылка на элемент Canvas с изображением
  imageRef: React.RefObject<HTMLCanvasElement> // Колбэк для передачи изменения гамма-коррекции
  onGammaCorrectionChange: (data: string) => void;
  closeModal: () => void; // Функция для закрытия модального окна
}

// Интерфейс для хранения гистограммы цветов (красный, зеленый, синий)
interface ColorRowsI {
  r: Map<number, number>;
  g: Map<number, number>;
  b: Map<number, number>;
}


// Основной компонент CurvesModal
const CurvesModal = ({
  imageRef: imageRef,
  onGammaCorrectionChange,
    closeModal
}: CurvesModalProps) => {
  // Ссылки на элементы Canvas для гистограммы и предпросмотра
  const histRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [curvePoints, setCurvePoints] = useState({
    // Состояние для управления точками входа и выхода кривой
    "enter": {
      "in": 0,
      "out": 0,
    },
    "exit": {
      "in": 255,
      "out": 255,
    },
  })
  // Состояние для активации предпросмотра
  const [isPreview, setIsPreview] = useState(false);

  // Первый useEffect для построения цветовых рядов при монтировании компонента
  useEffect(() => {
    const colorsHistData = getColorsHistData();
    buildColorRows(colorsHistData);
  }, []);

  // Второй useEffect для обновления гистограммы и кривой при изменении точек кривой
  useEffect(() => {
    const [canvas, ctx] = getCanvasNCtx(histRef);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colorsHistData = getColorsHistData();
    buildColorRows(colorsHistData);

    // ctx.beginPath();
    //
    // // Рисование базовой прямой линии (по умолчанию)
    // ctx.lineWidth = 3;
    // ctx.strokeStyle = "blue";
    // ctx.moveTo(0, 255);
    // ctx.lineTo(255, 0);
    // ctx.closePath();
    // ctx.stroke();

    // Рисование кривой на основе точек входа/выхода
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 255 - curvePoints.enter.out);
    ctx.lineTo(curvePoints.enter.in, 255 - curvePoints.enter.out);
    // ctx.arc(curvePoints.enter.in, 255 - curvePoints.enter.out, 5, 0, 2 * Math.PI);
    ctx.lineTo(curvePoints.exit.in, 255 - curvePoints.exit.out);
    // ctx.arc(curvePoints.exit.in, 255 - curvePoints.exit.out, 5, 0, 2 * Math.PI);
    ctx.lineTo(255, 255 - curvePoints.exit.out);
    ctx.stroke();

    // Вызов рендера предпросмотра, если активирован
    if (isPreview) {
      previewRender();
    }
  }, [curvePoints])

  // Третий useEffect для рендера предпросмотра при включении/выключении режима предпросмотра
  useEffect(() => {
    if (isPreview) {
      previewRender();
    }
  }, [isPreview])

  // Функция для рендеринга предпросмотра изображения с учетом гамма-коррекции
  const previewRender = () => {
    const [canvas, _] = getCanvasNCtx(imageRef);
    const [tempCanvas, tempCtx] = getCanvasNCtx(previewRef);
    // Подгонка размеров временного холста под изображение
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
// Получение обновленных данных изображения с учетом гамма-коррекции
    const tempImageData = getTempImageData();
    tempCtx?.putImageData(tempImageData, 0, 0);
  };

  // Функция для получения данных гистограммы цветов изображения
  const getColorsHistData = () => {
    const [canvas, ctx] = getCanvasNCtx(imageRef);
    const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const srcData = canvasImageData.data

    const colorsHistData: ColorRowsI = {
      "r": new Map(),
      "g": new Map(),
      "b": new Map(),
    };
    // Функция для построения гистограммы по каналам RGB
    for (let i = 0; i < srcData.length; i += 4) {
      // Увеличение счетчика для канала R, если значение уже есть в карте
      if (colorsHistData["r"].has(srcData[i])) {
        colorsHistData["r"].set(srcData[i], colorsHistData["r"].get(srcData[i])! + 1);
      } else {
        // Инициализация значения для канала R, если его нет
        colorsHistData["r"].set(srcData[i], 0);
      }

      // Аналогично для канала G
      if (colorsHistData["g"].has(srcData[i + 1])) {
        colorsHistData["g"].set(srcData[i + 1], colorsHistData["g"].get(srcData[i + 1])! + 1);
      } else {
        colorsHistData["g"].set(srcData[i + 1], 0);
      }

      // Аналогично для канала B
      if (colorsHistData["b"].has(srcData[i + 2])) {
        colorsHistData["b"].set(srcData[i + 2], colorsHistData["b"].get(srcData[i + 2])! + 1);
      } else {
        colorsHistData["b"].set(srcData[i + 2], 0);
      }
    }
    return colorsHistData;
  }

// Функция для построения столбцов по каждому цвету RGB
  const buildRGBColorRows = (data: ColorRowsI, color: "r" | "g" | "b") => {
    const [canvas, ctx] = getCanvasNCtx(histRef);

    // Находим максимальное значение гистограммы среди всех каналов
    const maxVal = Math.max(...data["r"].values(), ...data["g"].values(), ...data["b"].values());

    // Задаем цвет для канала
    if (color === "r") {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.65)'; // Красный цвет для канала R
    } else if (color === "g") {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.65)'; // Зеленый цвет для канала G
    } else {
      ctx.fillStyle = 'rgba(0, 0, 255, 0.65)'; // Синий цвет для канала B
    }

    // Рисуем столбцы гистограммы для каждого цвета
    for (let i of [...data[color].keys()].sort()) {
      const h = Math.floor(data[color].get(i)! * 256 / maxVal); // Высота столбца
      ctx.fillRect(i, canvas.height, 1, -h); // Рисуем столбец на канвасе
    }
  };

// Функция для отображения всех каналов RGB на канвасе
  const buildColorRows = (data: ColorRowsI) => {
    const [canvas, ctx] = getCanvasNCtx(histRef);
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаем канвас
    buildRGBColorRows(data, "r"); // Строим красный канал
    buildRGBColorRows(data, "g"); // Строим зеленый канал
    buildRGBColorRows(data, "b"); // Строим синий канал
  };

// Функция изменения кривых для точки входа и выхода по каждому цвету
  const changeCurvePoints = (
      e: React.KeyboardEvent<HTMLInputElement>,
      point: "enter" | "exit",
      pointParam: "in" | "out"
  ) => {
    // Проверка для значения входа (enter)
    if (point === "enter" && pointParam === "in") {
      if (parseInt((e.target as HTMLInputElement).value) > curvePoints.exit.in) return;
    }
    // Проверка для значения выхода (exit)
    if (point === "exit" && pointParam === "in") {
      if (parseInt((e.target as HTMLInputElement).value) < curvePoints.enter.in) return;
    }

    // Обновляем точки кривых
    setCurvePoints({
      ...curvePoints,
      [point]: {
        ...curvePoints[point],
        [pointParam]: parseInt((e.target as HTMLInputElement).value)
      }
    });
  };

// Функция для сброса значений кривых к исходным
  const resetCurvePoints = () => {
    setCurvePoints({
      enter: {
        in: 0,
        out: 0,
      },
      exit: {
        in: 255,
        out: 255,
      }
    });
  };

// Получение данных изображения с применением гамма-коррекции
  const getTempImageData = () => {
    const [canvas, ctx] = getCanvasNCtx(imageRef);
    const srcImageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const newImageData = new Uint8ClampedArray(canvas.width * canvas.height * 4);

    // Рассчитываем коэффициенты для прямой между двумя точками кривой (enter и exit)
    const x1 = curvePoints.enter.in;
    const y1 = curvePoints.enter.out;
    const x2 = curvePoints.exit.in;
    const y2 = curvePoints.exit.out;

    const a = (y2 - y1) / (x2 - x1); // Наклон прямой
    const b = y1 - a * x1; // Смещение

    // Функция для коррекции каждого пикселя по гамме
    const changePixelGammaCorrection = (i: number) => {
      if (srcImageData[i] <= x1) {
        newImageData[i] = y1; // Если значение меньше минимального, применяем минимальное
      } else if (srcImageData[i] >= x2) {
        newImageData[i] = y2; // Если значение больше максимального, применяем максимальное
      } else {
        newImageData[i] = a * srcImageData[i] + b; // Применяем гамма-коррекцию
      }
    };

    // Проходим по каждому пикселю и корректируем значения для R, G, B каналов
    for (let i = 0; i < newImageData.length; i += 4) {
      changePixelGammaCorrection(i); // R канал
      changePixelGammaCorrection(i + 1); // G канал
      changePixelGammaCorrection(i + 2); // B канал
      newImageData[i + 3] = srcImageData[i + 3]; // Альфа-канал (прозрачность) остается без изменений
    }

    // Возвращаем скорректированные данные изображения
    const tempImageData = new ImageData(newImageData, canvas.width, canvas.height);
    return tempImageData;
  };

// Функция для применения гамма-коррекции и отображения результата
  const changeGammaCorrection = () => {
    const [canvas, _] = getCanvasNCtx(imageRef);
    const [tempCanvas, tempCtx] = getCanvasNCtx(previewRef);

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const tempImageData = getTempImageData();
    tempCtx?.putImageData(tempImageData, 0, 0); // Отображаем данные на временном канвасе
    onGammaCorrectionChange(tempCanvas.toDataURL()); // Отправляем данные для отображения в режиме предпросмотра
  };


  return (
    <div className='curves-modal'>
      <canvas
        ref={ histRef }
        className='hist-canvas'
        width={ 256 }
        height={ 256 }
      />
      <div className="curves-inputs">
        <div className="curves-input">
          <p className='curves-input-label'>In</p>
          <InputNumber
              min={ 0 }
              max={ 255 }
              value={ curvePoints.enter.in }
              onPressEnter={ (e) => changeCurvePoints(e, "enter", "in") }
              placeholder='In'
          />
          <p className='curves-input-label'>Out</p>
          <InputNumber
              min={ 0 }
              max={ 255 }
              value={ curvePoints.enter.out }
              onPressEnter={ (e) => changeCurvePoints(e, "enter", "out") }
              placeholder='Out'
          />
        </div>
        <div className="curves-input">
          <p className='curves-input-label'>In</p>
          <InputNumber
              min={ 0 }
              max={ 255 }
              value={ curvePoints.exit.in }
              onPressEnter={ (e) => changeCurvePoints(e, "exit", "in") }
              placeholder='In'
          />
          <p className='curves-input-label'>Out</p>
          <InputNumber
              min={ 0 }
              max={ 255 }
              value={ curvePoints.exit.out }
              onPressEnter={ (e) => changeCurvePoints(e, "exit", "out") }
              placeholder='Out'
          />
        </div>
      </div>
      <canvas
        ref={ previewRef }
        className='preview'
        style={{
          height: ! isPreview ? 0 : ''
        }}
      />
      <div className="curves-btns">
        <Button type='primary' onClick={ () => {
          changeGammaCorrection();
          closeModal();
        }
        }>Изменить</Button>
        <Checkbox checked={ isPreview } onClick={ () => setIsPreview(!isPreview) }>Предпросмотр</Checkbox>
        <Button onClick={ resetCurvePoints }>Сбросить</Button>
      </div>
    </div>
  )
};

export default CurvesModal;
